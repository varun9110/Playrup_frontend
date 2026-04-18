import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import axios from '@/lib/axiosConfig';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { capitalizeWords } from '@/lib/utils';
import { ArrowLeft, Building2, Clock3, ExternalLink, Heart, MapPin, Share2, Sparkles, Star, Trophy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Amenities = {
  parking?: boolean;
  drinkingWater?: boolean;
  changingRooms?: boolean;
  warmupArea?: boolean;
  wifi?: boolean;
  cctvCamera?: boolean;
  shower?: boolean;
  cafeteria?: boolean;
};

type VenueSport = {
  sportName: string;
  numberOfCourts: number;
  startTime: string;
  endTime: string;
};

type Venue = {
  id: string;
  name: string;
  address?: string;
  city?: string;
  mapLink?: string;
  photos?: string[];
  openTime?: string;
  closeTime?: string;
  amenities?: Amenities;
  sports?: VenueSport[];
  totalGamesPlayed: number;
  upcomingGames: number;
  averageRating: number;
  totalRatings: number;
  shareCode: string;
  viewer?: {
    isFavorite?: boolean;
    myRating?: number;
  };
};

type VenueRouteState = {
  city?: string;
  sport?: string;
  date?: string;
};

const amenityLabels: Array<{ key: keyof Amenities; label: string }> = [
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

export default function PublicVenueShare() {
  const { shareCode } = useParams<{ shareCode: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  }, []);
  const hasToken = Boolean(localStorage.getItem('token'));

  const [loading, setLoading] = useState(true);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [favoriting, setFavoriting] = useState(false);
  const [savingRating, setSavingRating] = useState(false);

  const routeState = (location.state as VenueRouteState | null) || null;

  const shareLink = useMemo(() => window.location.href, []);

  useEffect(() => {
    const loadVenue = async () => {
      if (!shareCode) return;

      try {
        const endpoint = hasToken ? `/api/user/venue/${shareCode}` : `/api/public/venue/${shareCode}`;
        const res = await axios.get(endpoint);
        setVenue(res.data?.venue || null);
      } catch (error) {
        console.error('Failed to fetch venue details', error);
        setVenue(null);
      } finally {
        setLoading(false);
      }
    };

    void loadVenue();
  }, [hasToken, shareCode]);

  const handleCopyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      toast({ title: 'Link copied' });
    } catch {
      toast({ title: 'Failed to copy link', variant: 'destructive' });
    }
  };

  const handleBookVenue = () => {
    if (!venue) return;
    const today = new Date();
    const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const fallbackSport = venue.sports?.[0]?.sportName || '';

    navigate('/bookcourt', {
      state: {
        city: routeState?.city || venue.city || '',
        sport: routeState?.sport || fallbackSport,
        date: routeState?.date || dateString,
        academyId: venue.id,
      },
    });
  };

  const handleToggleFavorite = async () => {
    if (!hasToken || !venue?.id) {
      navigate('/login');
      return;
    }

    const nextFavorite = !Boolean(venue.viewer?.isFavorite);
    setFavoriting(true);
    try {
      const res = await axios.post(`/api/user/venue/${venue.id}/favorite`, { isFavorite: nextFavorite });
      setVenue((prev) => prev ? {
        ...prev,
        viewer: {
          ...prev.viewer,
          isFavorite: Boolean(res.data?.isFavorite),
        },
      } : prev);
      toast({ title: nextFavorite ? 'Venue added to favorites' : 'Venue removed from favorites' });
    } catch (error) {
      console.error('Failed to update favorite status', error);
      toast({ title: 'Failed to update favorite', variant: 'destructive' });
    } finally {
      setFavoriting(false);
    }
  };

  const handleRateVenue = async (rating: number) => {
    if (!hasToken || !venue?.id) {
      navigate('/login');
      return;
    }

    setSavingRating(true);
    try {
      await axios.post(`/api/user/venue/${venue.id}/rate`, { rating });
      setVenue((prev) => {
        if (!prev) return prev;
        const previousMyRating = prev.viewer?.myRating || 0;
        const currentTotal = prev.totalRatings || 0;
        const previousTotalScore = prev.averageRating * currentTotal;
        const adjustedTotalScore = previousMyRating > 0
          ? (previousTotalScore - previousMyRating + rating)
          : (previousTotalScore + rating);
        const adjustedCount = previousMyRating > 0 ? currentTotal : currentTotal + 1;
        const nextAverage = adjustedCount ? Number((adjustedTotalScore / adjustedCount).toFixed(1)) : 0;

        return {
          ...prev,
          averageRating: nextAverage,
          totalRatings: adjustedCount,
          viewer: {
            ...prev.viewer,
            myRating: rating,
          },
        };
      });
      toast({ title: 'Venue rating saved' });
    } catch (error) {
      console.error('Failed to rate venue', error);
      toast({ title: 'Failed to save rating', variant: 'destructive' });
    } finally {
      setSavingRating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <Card>
            <CardHeader className="bg-gradient-to-r from-cyan-50 to-sky-50 border-b">
              <CardTitle>Venue Details</CardTitle>
              <CardDescription>Loading venue profile...</CardDescription>
            </CardHeader>
            <CardContent className="p-8 text-center text-slate-500">Loading...</CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <Card>
            <CardHeader className="bg-gradient-to-r from-cyan-50 to-sky-50 border-b">
              <CardTitle>Venue Details</CardTitle>
              <CardDescription>This venue share link is not available.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 text-center space-y-4">
              <p className="text-slate-700">This venue may have been removed or the link is invalid.</p>
              <Button onClick={() => navigate('/login')}>Go To Login</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const mapEmbedUrl = getEmbedMapUrl(venue.mapLink || '', `${venue.address || ''} ${venue.city || ''}`.trim());
  const averageStars = Math.round(venue.averageRating || 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="container mx-auto px-4 py-8 md:py-12 max-w-6xl space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigate(-1)}
                aria-label="Go back"
                title="Go back"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900">{capitalizeWords(venue.name)}</h1>
            </div>
            <p className="text-slate-600 text-lg">Explore this academy venue, facilities, games, and ratings.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopyShareLink}
              aria-label="Copy venue share link"
              title="Copy venue share link"
            >
              <Share2 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleToggleFavorite}
              disabled={favoriting}
              aria-label={venue.viewer?.isFavorite ? 'Unfavorite venue' : 'Favorite venue'}
              title={venue.viewer?.isFavorite ? 'Unfavorite venue' : 'Favorite venue'}
            >
              <Heart className={`h-4 w-4 ${venue.viewer?.isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
            </Button>
            <Button onClick={handleBookVenue}>
              Book Venue
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card><CardContent className="p-5"><p className="text-sm text-slate-500 flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-500" />Total Games</p><p className="text-2xl font-bold">{venue.totalGamesPlayed}</p></CardContent></Card>
          <Card><CardContent className="p-5"><p className="text-sm text-slate-500 flex items-center gap-2"><Sparkles className="h-4 w-4 text-blue-600" />Upcoming Games</p><p className="text-2xl font-bold">{venue.upcomingGames}</p></CardContent></Card>
          <Card><CardContent className="p-5"><p className="text-sm text-slate-500 flex items-center gap-2"><Star className="h-4 w-4 text-amber-500" />Average Rating</p><p className="text-2xl font-bold">{venue.averageRating.toFixed(1)} / 5</p></CardContent></Card>
          <Card><CardContent className="p-5"><p className="text-sm text-slate-500 flex items-center gap-2"><Building2 className="h-4 w-4 text-emerald-600" />Total Ratings</p><p className="text-2xl font-bold">{venue.totalRatings}</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" />Location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-slate-700">{capitalizeWords([venue.address, venue.city].filter(Boolean).join(', ')) || 'Location not provided'}</p>
            {mapEmbedUrl && (
              <iframe
                title="venue-map"
                src={mapEmbedUrl}
                className="w-full h-72 rounded-lg border"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            )}
            {venue.mapLink && (
              <a href={venue.mapLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-blue-700">
                Open Map <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </CardContent>
        </Card>

        {(venue.photos || []).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Venue Photos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {(venue.photos || []).map((photoUrl) => (
                  <img key={photoUrl} src={buildAbsoluteUrl(photoUrl)} alt="venue" className="w-full h-36 rounded-lg object-cover border" />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Clock3 className="h-5 w-5 text-primary" />Timing & Sports</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-600">Venue Timing: <span className="font-medium text-slate-900">{venue.openTime || '--:--'} - {venue.closeTime || '--:--'}</span></p>
              {(venue.sports || []).map((sport) => (
                <div key={`${sport.sportName}-${sport.numberOfCourts}`} className="rounded-lg border p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{capitalizeWords(sport.sportName)}</p>
                    <p className="text-xs text-slate-500">{sport.numberOfCourts} court(s)</p>
                  </div>
                  <Badge variant="secondary">{sport.startTime} - {sport.endTime}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Amenities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {amenityLabels.map((item) => {
                  const available = Boolean(venue.amenities?.[item.key]);
                  return (
                    <div key={item.key} className="rounded-lg border p-3 flex items-center justify-between">
                      <span className="text-sm text-slate-700">{item.label}</span>
                      <Badge className={available ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-100'}>
                        {available ? 'Available' : 'N/A'}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Venue Rating</CardTitle>
            <CardDescription>Average rating and your rating out of 5 stars.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star
                  key={index}
                  className={`h-6 w-6 ${index < averageStars ? 'text-amber-500 fill-amber-400' : 'text-slate-300'}`}
                />
              ))}
              <span className="ml-2 text-sm text-slate-600">{venue.averageRating.toFixed(1)} / 5</span>
            </div>

            <div>
              <p className="text-sm text-slate-600 mb-2">Your Rating</p>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, index) => {
                  const starNumber = index + 1;
                  const active = starNumber <= (venue.viewer?.myRating || 0);
                  return (
                    <button
                      key={starNumber}
                      type="button"
                      className="p-1"
                      onClick={() => void handleRateVenue(starNumber)}
                      disabled={savingRating}
                      aria-label={`Rate ${starNumber} star${starNumber > 1 ? 's' : ''}`}
                    >
                      <Star className={`h-6 w-6 ${active ? 'text-amber-500 fill-amber-400' : 'text-slate-300'}`} />
                    </button>
                  );
                })}
                {!hasToken && (
                  <span className="text-xs text-slate-500 ml-2">Login to rate</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
