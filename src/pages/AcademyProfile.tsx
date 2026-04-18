import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '@/lib/axiosConfig';
import { Navbar } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Building2,
  Camera,
  Clock3,
  ExternalLink,
  MapPin,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  Waves,
} from 'lucide-react';
import { capitalizeWords } from '@/lib/utils';

type AcademySport = {
  sportName: string;
  numberOfCourts: number;
  startTime: string;
  endTime: string;
};

type Amenities = {
  parking: boolean;
  drinkingWater: boolean;
  changingRooms: boolean;
  warmupArea: boolean;
  wifi: boolean;
  cctvCamera: boolean;
  shower: boolean;
  cafeteria: boolean;
};

type AcademyProfileData = {
  _id: string;
  name: string;
  phone?: string;
  address?: string;
  city?: string;
  mapLink?: string;
  photos?: string[];
  openTime?: string;
  closeTime?: string;
  amenities?: Amenities;
  sports: AcademySport[];
};

type AcademyStats = {
  totalGamesPlayed: number;
  upcomingGames: number;
  averageRating: number;
  totalRatings: number;
};

type AcademyListItem = {
  _id: string;
  name: string;
};

const defaultAmenities: Amenities = {
  parking: false,
  drinkingWater: false,
  changingRooms: false,
  warmupArea: false,
  wifi: false,
  cctvCamera: false,
  shower: false,
  cafeteria: false,
};

const amenityFields: Array<{ key: keyof Amenities; label: string }> = [
  { key: 'parking', label: 'Parking' },
  { key: 'drinkingWater', label: 'Drinking Water' },
  { key: 'changingRooms', label: 'Changing Rooms' },
  { key: 'warmupArea', label: 'Warmup Area' },
  { key: 'wifi', label: 'Wi-Fi' },
  { key: 'cctvCamera', label: 'CCTV Camera' },
  { key: 'shower', label: 'Shower' },
  { key: 'cafeteria', label: 'Cafeteria' },
];

const buildAbsoluteUrl = (relativePath: string) => {
  const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  return `${String(base).replace(/\/+$/, '')}${relativePath}`;
};

const getEmbedMapUrl = (mapLink: string, fallbackAddress: string) => {
  const trimmed = String(mapLink || '').trim();

  if (!trimmed && fallbackAddress) {
    return `https://maps.google.com/maps?q=${encodeURIComponent(fallbackAddress)}&z=15&output=embed`;
  }

  if (trimmed.includes('/maps/embed')) {
    return trimmed;
  }

  if (trimmed.includes('google.com/maps')) {
    return `https://maps.google.com/maps?q=${encodeURIComponent(trimmed)}&z=15&output=embed`;
  }

  if (trimmed) {
    return `https://maps.google.com/maps?q=${encodeURIComponent(trimmed)}&z=15&output=embed`;
  }

  return '';
};

export default function AcademyProfile() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  }, []);

  const [academies, setAcademies] = useState<AcademyListItem[]>([]);
  const [selectedAcademyId, setSelectedAcademyId] = useState('');
  const [academy, setAcademy] = useState<AcademyProfileData | null>(null);
  const [stats, setStats] = useState<AcademyStats>({
    totalGamesPlayed: 0,
    upcomingGames: 0,
    averageRating: 0,
    totalRatings: 0,
  });
  const [shareLink, setShareLink] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<FileList | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/', { replace: true });
      return;
    }

    const loadAcademies = async () => {
      try {
        const res = await axios.post('/api/academy/user-academies', { userId: user.userId });
        const list: AcademyListItem[] = res.data?.data || [];
        setAcademies(list);
        if (list.length) {
          setSelectedAcademyId(list[0]._id);
        }
      } catch (error) {
        console.error('Failed to fetch academy list', error);
        setAcademies([]);
      }
    };

    void loadAcademies();
  }, [navigate, user]);

  const fetchProfile = async (academyId: string) => {
    if (!academyId) return;

    setLoading(true);
    try {
      const res = await axios.get(`/api/academy/profile/${academyId}`);
      setAcademy(res.data?.academy || null);
      setStats(res.data?.stats || { totalGamesPlayed: 0, upcomingGames: 0, averageRating: 0, totalRatings: 0 });
      const relativeShare = res.data?.shareLink || '';
      setShareLink(relativeShare ? `${window.location.origin}${relativeShare}` : '');
    } catch (error) {
      console.error('Failed to fetch academy profile', error);
      toast({ title: 'Could not load profile', variant: 'destructive' });
      setAcademy(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedAcademyId) return;
    void fetchProfile(selectedAcademyId);
  }, [selectedAcademyId]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const handleAmenityChange = (key: keyof Amenities, checked: boolean) => {
    setAcademy((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        amenities: {
          ...defaultAmenities,
          ...(prev.amenities || {}),
          [key]: checked,
        },
      };
    });
  };

  const handleInputChange = (field: keyof AcademyProfileData, value: string) => {
    setAcademy((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSave = async () => {
    if (!academy?._id) return;

    setSaving(true);
    try {
      const payload = {
        name: academy.name,
        phone: academy.phone || '',
        address: academy.address || '',
        city: academy.city || '',
        mapLink: academy.mapLink || '',
        openTime: academy.openTime || '',
        closeTime: academy.closeTime || '',
        amenities: {
          ...defaultAmenities,
          ...(academy.amenities || {}),
        },
      };

      const res = await axios.put(`/api/academy/profile/${academy._id}`, payload);
      setAcademy(res.data?.academy || academy);
      setStats(res.data?.stats || stats);
      const relativeShare = res.data?.shareLink || '';
      setShareLink(relativeShare ? `${window.location.origin}${relativeShare}` : shareLink);
      setIsEditMode(false);
      toast({ title: 'Profile updated successfully' });
    } catch (error) {
      console.error('Failed to update academy profile', error);
      toast({ title: 'Save failed', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoSelection = (event: ChangeEvent<HTMLInputElement>) => {
    setSelectedPhotos(event.target.files);
  };

  const handleUploadPhotos = async () => {
    if (!academy?._id || !selectedPhotos || !selectedPhotos.length) {
      toast({ title: 'Select at least one photo', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(selectedPhotos).forEach((file) => {
        formData.append('photos', file);
      });

      const res = await axios.post(`/api/academy/profile/${academy._id}/photos`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setAcademy((prev) => (prev ? { ...prev, photos: res.data?.photos || prev.photos || [] } : prev));
      setSelectedPhotos(null);
      toast({ title: 'Photos uploaded' });
    } catch (error) {
      console.error('Failed to upload photos', error);
      toast({ title: 'Photo upload failed', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (photoUrl: string) => {
    if (!academy?._id) return;

    try {
      const res = await axios.delete(`/api/academy/profile/${academy._id}/photos`, {
        data: { photoUrl },
      });

      setAcademy((prev) => (prev ? { ...prev, photos: res.data?.photos || [] } : prev));
      toast({ title: 'Photo removed' });
    } catch (error) {
      console.error('Failed to remove photo', error);
      toast({ title: 'Could not remove photo', variant: 'destructive' });
    }
  };

  const handleCopyShareLink = async () => {
    if (!shareLink) return;

    try {
      await navigator.clipboard.writeText(shareLink);
      toast({ title: 'Venue link copied' });
    } catch {
      toast({ title: 'Could not copy link', variant: 'destructive' });
    }
  };

  const formatDisplayValue = (value?: string) => capitalizeWords(String(value || ''));

  const mapEmbedUrl = getEmbedMapUrl(academy?.mapLink || '', `${academy?.address || ''} ${academy?.city || ''}`.trim());

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <Navbar onLogout={handleLogout} />

      <div className="container mx-auto px-4 py-8 md:py-12 max-w-7xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 mb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-2">Academy Profile</h1>
            <p className="text-slate-600 text-lg">Manage venue details, timings, amenities, photos, and public share link.</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            {!isEditMode ? (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-lg h-11 w-11"
                  onClick={handleCopyShareLink}
                  disabled={!shareLink}
                  title="Copy venue share link"
                  aria-label="Copy venue share link"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button className="rounded-lg h-11" onClick={() => setIsEditMode(true)} disabled={loading || !academy}>
                  Edit Profile
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" className="rounded-lg h-11" onClick={() => setIsEditMode(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button className="rounded-lg h-11" onClick={handleSave} disabled={saving || loading || !academy}>
                  {saving ? 'Saving...' : 'Save Profile'}
                </Button>
              </>
            )}
          </div>
        </div>

        {academies.length > 1 && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="space-y-2">
                <Label htmlFor="academy-select">Select Academy</Label>
                <select
                  id="academy-select"
                  className="h-10 rounded-md border border-input px-3 w-full max-w-sm"
                  value={selectedAcademyId}
                  onChange={(event) => setSelectedAcademyId(event.target.value)}
                  disabled={isEditMode}
                >
                  {academies.map((item) => (
                    <option key={item._id} value={item._id}>
                      {capitalizeWords(item.name)}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>
        )}

        {loading || !academy ? (
          <Card>
            <CardContent className="p-8 text-center text-slate-500">Loading academy profile...</CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <Card className="border-slate-200">
                <CardContent className="p-5 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-slate-500"><Trophy className="h-4 w-4 text-amber-600" />Total Games Played</div>
                  <p className="text-2xl font-bold text-slate-900">{stats.totalGamesPlayed}</p>
                </CardContent>
              </Card>
              <Card className="border-slate-200">
                <CardContent className="p-5 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-slate-500"><Sparkles className="h-4 w-4 text-blue-600" />Upcoming Games</div>
                  <p className="text-2xl font-bold text-slate-900">{stats.upcomingGames}</p>
                </CardContent>
              </Card>
              <Card className="border-slate-200">
                <CardContent className="p-5 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-slate-500"><Star className="h-4 w-4 text-amber-500" />Average Rating</div>
                  <p className="text-2xl font-bold text-slate-900">{stats.averageRating.toFixed(1)} / 5</p>
                </CardContent>
              </Card>
              <Card className="border-slate-200">
                <CardContent className="p-5 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-slate-500"><ShieldCheck className="h-4 w-4 text-emerald-600" />Total Ratings</div>
                  <p className="text-2xl font-bold text-slate-900">{stats.totalRatings}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" />Basic Details</CardTitle>
                <CardDescription>Update your academy identity and contact information.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="academy-name">Academy Name</Label>
                    <Input
                      id="academy-name"
                      value={isEditMode ? (academy.name || '') : formatDisplayValue(academy.name)}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      disabled={!isEditMode}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="academy-phone">Phone</Label>
                    <Input id="academy-phone" value={academy.phone || ''} onChange={(e) => handleInputChange('phone', e.target.value)} disabled={!isEditMode} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="academy-city">City</Label>
                    <Input
                      id="academy-city"
                      value={isEditMode ? (academy.city || '') : formatDisplayValue(academy.city)}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      disabled={!isEditMode}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="academy-address">Address</Label>
                    <Input
                      id="academy-address"
                      value={isEditMode ? (academy.address || '') : formatDisplayValue(academy.address)}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      disabled={!isEditMode}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="academy-map-link">Google Map Link or Address</Label>
                  <Input id="academy-map-link" value={academy.mapLink || ''} onChange={(e) => handleInputChange('mapLink', e.target.value)} placeholder="Paste Google Maps link or map search text" disabled={!isEditMode} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="open-time">Open Time</Label>
                    <Input id="open-time" type="time" value={academy.openTime || ''} onChange={(e) => handleInputChange('openTime', e.target.value)} disabled={!isEditMode} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="close-time">Close Time</Label>
                    <Input id="close-time" type="time" value={academy.closeTime || ''} onChange={(e) => handleInputChange('closeTime', e.target.value)} disabled={!isEditMode} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" />Venue Map</CardTitle>
                </CardHeader>
                <CardContent>
                  {mapEmbedUrl ? (
                    <iframe
                      title="academy-map"
                      src={mapEmbedUrl}
                      className="w-full h-72 rounded-lg border"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  ) : (
                    <div className="h-72 rounded-lg border border-dashed flex items-center justify-center text-slate-500">
                      Add a map link to preview your venue location.
                    </div>
                  )}
                  {academy.mapLink && (
                    <a
                      href={academy.mapLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-blue-700 mt-3"
                    >
                      Open Full Map <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Clock3 className="h-5 w-5 text-primary" />Sport Timings</CardTitle>
                  <CardDescription>Current operating slots across configured sports.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(academy.sports || []).length === 0 ? (
                    <p className="text-sm text-slate-500">No sports configured yet.</p>
                  ) : (
                    academy.sports.map((sport) => (
                      <div key={`${sport.sportName}-${sport.numberOfCourts}`} className="rounded-lg border p-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900">{capitalizeWords(sport.sportName)}</p>
                          <p className="text-sm text-slate-500">{sport.numberOfCourts} court(s)</p>
                        </div>
                        <Badge variant="secondary">
                          {sport.startTime} - {sport.endTime}
                        </Badge>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Waves className="h-5 w-5 text-primary" />Amenities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {amenityFields.map((field) => (
                    <label key={field.key} className="flex items-center gap-2 rounded-md border p-3 cursor-pointer hover:bg-slate-50">
                      <Checkbox
                        checked={Boolean((academy.amenities || defaultAmenities)[field.key])}
                        onCheckedChange={(checked) => handleAmenityChange(field.key, Boolean(checked))}
                        disabled={!isEditMode}
                      />
                      <span className="text-sm text-slate-700">{field.label}</span>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Camera className="h-5 w-5 text-primary" />Venue Photos</CardTitle>
                <CardDescription>Upload clear images of your courts and facilities.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <Input type="file" multiple accept="image/*" onChange={handlePhotoSelection} className="max-w-md" disabled={!isEditMode} />
                  <Button onClick={handleUploadPhotos} disabled={!isEditMode || uploading || !selectedPhotos?.length}>
                    {uploading ? 'Uploading...' : 'Upload Photos'}
                  </Button>
                </div>

                {(academy.photos || []).length === 0 ? (
                  <p className="text-sm text-slate-500">No venue photos uploaded yet.</p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                    {(academy.photos || []).map((photoUrl) => (
                      <div key={photoUrl} className="relative group rounded-lg overflow-hidden border">
                        <img src={buildAbsoluteUrl(photoUrl)} alt="academy" className="w-full h-32 object-cover" />
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-7"
                          onClick={() => void handleDeletePhoto(photoUrl)}
                          disabled={!isEditMode}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        )}
      </div>
    </div>
  );
}
