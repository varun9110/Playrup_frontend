import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '@/lib/axiosConfig';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

type Template = {
  _id: string;
  key: string;
  title: string;
  body: string;
  channels: {
    push: boolean;
    email: boolean;
    sms: boolean;
  };
};

type NotificationItem = {
  _id: string;
  templateKey: string;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  recipientUser: {
    _id: string;
    name: string;
    email: string;
    role: string;
  } | null;
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

export default function AdminNotifications() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const user = JSON.parse(localStorage.getItem('user') || 'null');

  useEffect(() => {
    if (!user || user.role !== 'superadmin') {
      navigate('/');
      return;
    }

    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [templatesRes, notificationsRes] = await Promise.all([
        axios.get('/api/notification/admin/templates'),
        axios.get('/api/notification/admin/all', {
          params: {
            limit: 200,
            offset: 0
          }
        })
      ]);

      setTemplates(templatesRes.data.templates || []);
      setNotifications(notificationsRes.data.items || []);
    } catch (error) {
      console.error('Failed to load notification admin data', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTemplate = (key: string, updater: (template: Template) => Template) => {
    setTemplates((prev) => prev.map((template) => (template.key === key ? updater(template) : template)));
  };

  const saveTemplate = async (template: Template) => {
    setSavingKey(template.key);
    try {
      await axios.put(`/api/notification/admin/templates/${template.key}`, {
        title: template.title,
        body: template.body,
        channels: template.channels
      });
    } catch (error) {
      console.error('Failed to save template', error);
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) {
    return <div className="p-6">Loading notification controls...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notification Control Center</h1>
          <p className="text-sm text-muted-foreground">
            Edit notification copy and channel delivery rules globally.
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/adminlanding')}>
          Back to Admin Home
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notification Templates</CardTitle>
          <CardDescription>
            Configure title, body, and channel toggles for each notification type.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {templates.map((template) => (
            <div key={template._id} className="rounded-lg border p-4 space-y-3">
              <div className="text-xs text-muted-foreground">{template.key}</div>

              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={template.title}
                  onChange={(event) =>
                    updateTemplate(template.key, (current) => ({
                      ...current,
                      title: event.target.value
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Body</Label>
                <Textarea
                  value={template.body}
                  rows={3}
                  onChange={(event) =>
                    updateTemplate(template.key, (current) => ({
                      ...current,
                      body: event.target.value
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Use placeholders like {'{{sport}}'}, {'{{date}}'}, {'{{startTime}}'}, {'{{userName}}'} where relevant.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                  <Label>Push</Label>
                  <Switch
                    checked={template.channels.push}
                    onCheckedChange={(value) =>
                      updateTemplate(template.key, (current) => ({
                        ...current,
                        channels: { ...current.channels, push: value }
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                  <Label>Email</Label>
                  <Switch
                    checked={template.channels.email}
                    onCheckedChange={(value) =>
                      updateTemplate(template.key, (current) => ({
                        ...current,
                        channels: { ...current.channels, email: value }
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                  <Label>Text (SMS)</Label>
                  <Switch
                    checked={template.channels.sms}
                    onCheckedChange={(value) =>
                      updateTemplate(template.key, (current) => ({
                        ...current,
                        channels: { ...current.channels, sms: value }
                      }))
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => saveTemplate(template)} disabled={savingKey === template.key}>
                  {savingKey === template.key ? 'Saving...' : 'Save Template'}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Notifications</CardTitle>
          <CardDescription>System-wide notification activity feed.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {notifications.map((item) => (
            <div key={item._id} className="rounded-lg border p-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{item.templateKey}</span>
                <span>|</span>
                <span>{formatDateTime(item.createdAt)}</span>
                <span>|</span>
                <span>{item.readAt ? 'Read' : 'Unread'}</span>
              </div>
              <p className="mt-1 font-semibold">{item.title}</p>
              <p className="text-sm text-muted-foreground">{item.body}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Recipient: {item.recipientUser?.name || 'Unknown'} ({item.recipientUser?.email || 'N/A'})
              </p>
            </div>
          ))}

          {!notifications.length && <p className="text-sm text-muted-foreground">No notifications found.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
