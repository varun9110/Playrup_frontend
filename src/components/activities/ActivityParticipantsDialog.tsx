import { useEffect, useState } from 'react';
import axios from 'axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';

type EncryptedValue = {
  iv: string;
  content: string;
  tag: string;
};

type ActivityParticipant = {
  id: EncryptedValue | string;
  name: string;
  email?: string;
  isHost: boolean;
};

type ActivityParticipantsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activityId?: string | null;
  activityTitle?: string;
  onViewProfile: (participantId: EncryptedValue | string, participantName?: string) => void;
};

export default function ActivityParticipantsDialog({
  open,
  onOpenChange,
  activityId,
  activityTitle,
  onViewProfile,
}: ActivityParticipantsDialogProps) {
  const [participants, setParticipants] = useState<ActivityParticipant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchParticipants = async () => {
      if (!open || !activityId) return;

      setLoading(true);
      setError('');

      try {
        const response = await axios.get(`/api/activity/${activityId}/participants`);
        setParticipants(response.data?.participants || []);
      } catch (fetchError) {
        console.error('Failed to fetch participants', fetchError);
        setError('Unable to load participants right now. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchParticipants();
  }, [open, activityId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            {activityTitle ? `${activityTitle} Participants` : 'Activity Participants'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
          {loading && (
            <p className="text-sm text-muted-foreground">Loading participants...</p>
          )}

          {!loading && !!error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {!loading && !error && participants.length === 0 && (
            <p className="text-sm text-muted-foreground">No participants found for this activity.</p>
          )}

          {!loading && !error && participants.map((participant) => (
            <div
              key={`${typeof participant.id === 'string' ? participant.id : participant.id.content}-${participant.name}`}
              className="rounded-lg border p-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => onViewProfile(participant.id, participant.name)}
                    className="font-medium text-blue-700 hover:text-blue-800 hover:underline truncate text-left"
                  >
                    {participant.name || 'Player'}
                  </button>
                  {participant.isHost && (
                    <Badge variant="secondary" className="text-xs">Host</Badge>
                  )}
                </div>
                {!!participant.email && (
                  <p className="text-xs text-muted-foreground truncate">{participant.email}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
