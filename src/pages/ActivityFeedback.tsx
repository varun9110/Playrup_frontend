import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CircleAlert, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';
import { utcDateTimeToLocalParts } from '@/lib/utils';

type EncryptedValue = {
  iv: string;
  content: string;
  tag: string;
};

type SkillLevelOption = 'Beginner' | 'Amateur' | 'Intermediate' | 'Advanced' | 'Professional';
type PunctualityOption = 'Punctual' | 'Late';
type ScoreOption = '-2' | '-1' | '1' | '2';

type FeedbackStatus = {
  canSubmit: boolean;
  totalRecipients: number;
  submittedCount: number;
  isComplete: boolean;
};

type FeedbackExistingValue = {
  noShow: boolean;
  punctualStatus: PunctualityOption | null;
  teamPlayerScore: number | null;
  paymentScore: number | null;
  skillLevel: SkillLevelOption | null;
  updatedAt?: string | null;
};

type FeedbackParticipant = {
  id: EncryptedValue;
  name: string;
  isHost: boolean;
  existingFeedback: FeedbackExistingValue | null;
};

type FeedbackFormValue = {
  noShow: boolean;
  punctualStatus: PunctualityOption | '';
  teamPlayerScore: ScoreOption | '';
  paymentScore: ScoreOption | '';
  skillLevel: SkillLevelOption | '';
};

type FeedbackFormResponse = {
  activity: {
    _id: string;
    sport: string;
    date: string;
    fromTime: string;
    toTime: string;
    feedbackStatus: FeedbackStatus;
  };
  participants: FeedbackParticipant[];
};

const SKILL_LEVEL_OPTIONS: SkillLevelOption[] = ['Beginner', 'Amateur', 'Intermediate', 'Advanced', 'Professional'];
const SCORE_OPTIONS: Array<{ value: ScoreOption; label: string }> = [
  { value: '-2', label: 'Very Bad (-2)' },
  { value: '-1', label: 'Bad (-1)' },
  { value: '1', label: 'Good (+1)' },
  { value: '2', label: 'Very Good (+2)' },
];

const createDefaultFeedbackValue = (): FeedbackFormValue => ({
  noShow: false,
  punctualStatus: '',
  teamPlayerScore: '',
  paymentScore: '',
  skillLevel: '',
});

const createFeedbackValueFromExisting = (existing: FeedbackExistingValue | null): FeedbackFormValue => {
  if (!existing) {
    return createDefaultFeedbackValue();
  }

  return {
    noShow: Boolean(existing.noShow),
    punctualStatus: existing.noShow ? '' : (existing.punctualStatus || ''),
    teamPlayerScore: existing.noShow || existing.teamPlayerScore === null ? '' : String(existing.teamPlayerScore) as ScoreOption,
    paymentScore: existing.noShow || existing.paymentScore === null ? '' : String(existing.paymentScore) as ScoreOption,
    skillLevel: existing.noShow ? '' : (existing.skillLevel || ''),
  };
};

export default function ActivityFeedback() {
  const navigate = useNavigate();
  const { activityId } = useParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activity, setActivity] = useState<FeedbackFormResponse['activity'] | null>(null);
  const [participants, setParticipants] = useState<FeedbackParticipant[]>([]);
  const [feedbackForm, setFeedbackForm] = useState<Record<string, FeedbackFormValue>>({});

  useEffect(() => {
    if (!activityId) {
      navigate('/my-hosted');
      return;
    }

    const fetchFeedbackForm = async () => {
      try {
        const response = await axios.get<FeedbackFormResponse>(`/api/activity/${activityId}/feedback-form`);
        const nextParticipants = response.data.participants || [];

        setActivity(response.data.activity);
        setParticipants(nextParticipants);
        setFeedbackForm(
          nextParticipants.reduce<Record<string, FeedbackFormValue>>((acc, participant) => {
            acc[participant.id.content] = createFeedbackValueFromExisting(participant.existingFeedback);
            return acc;
          }, {})
        );
      } catch (error) {
        console.error('Failed to fetch feedback form', error);
        toast.error('Could not load the player rating screen');
        navigate('/my-hosted');
      } finally {
        setLoading(false);
      }
    };

    fetchFeedbackForm();
  }, [activityId, navigate]);

  const updateFeedbackValue = (
    participantId: string,
    updater: (current: FeedbackFormValue) => FeedbackFormValue
  ) => {
    setFeedbackForm((current) => ({
      ...current,
      [participantId]: updater(current[participantId] || createDefaultFeedbackValue()),
    }));
  };

  const submitFeedback = async () => {
    if (!activityId) return;

    const missingParticipant = participants.find((participant) => {
      const currentValue = feedbackForm[participant.id.content] || createDefaultFeedbackValue();
      if (currentValue.noShow) {
        return false;
      }

      return !currentValue.punctualStatus
        || !currentValue.teamPlayerScore
        || !currentValue.paymentScore
        || !currentValue.skillLevel;
    });

    if (missingParticipant) {
      toast.error(`Complete feedback for ${missingParticipant.name} before submitting.`);
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`/api/activity/${activityId}/feedback`, {
        feedback: participants.map((participant) => {
          const currentValue = feedbackForm[participant.id.content] || createDefaultFeedbackValue();
          return {
            recipientId: participant.id,
            noShow: currentValue.noShow,
            ...(currentValue.noShow
              ? {}
              : {
                  punctualStatus: currentValue.punctualStatus,
                  teamPlayerScore: Number(currentValue.teamPlayerScore),
                  paymentScore: Number(currentValue.paymentScore),
                  skillLevel: currentValue.skillLevel,
                }),
          };
        }),
      });

      toast.success('Anonymous feedback saved');
      navigate('/my-hosted');
    } catch (error) {
      console.error('Failed to submit feedback', error);
      toast.error('Could not submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  const localStart = activity ? utcDateTimeToLocalParts(activity.date, activity.fromTime) : null;
  const localEnd = activity ? utcDateTimeToLocalParts(activity.date, activity.toTime) : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 p-6">
        <div className="mx-auto max-w-5xl flex items-center justify-center py-24 text-muted-foreground gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading player rating screen...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Button variant="ghost" className="mb-2 pl-0" onClick={() => navigate('/my-hosted')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Past Activities
            </Button>
            <h1 className="text-3xl font-bold">Rate Players</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Submit anonymous ratings for everyone who played in this completed activity.
            </p>
          </div>

          {activity?.feedbackStatus && (
            <Badge variant="secondary" className="px-3 py-1.5 text-sm">
              {activity.feedbackStatus.submittedCount}/{activity.feedbackStatus.totalRecipients} completed
            </Badge>
          )}
        </div>

        {activity && (
          <Card>
            <CardHeader>
              <CardTitle>{activity.sport}</CardTitle>
              <CardDescription>
                {(localStart?.dateObj || new Date(activity.date)).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
                {' · '}
                {localStart?.time || activity.fromTime} - {localEnd?.time || activity.toTime}
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {!participants.length ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No other participants are available to rate for this activity.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground flex gap-3">
              <CircleAlert className="h-4 w-4 mt-0.5 shrink-0" />
              <p>If you mark a player as a no-show, punctuality, team player, payment, and skill fields are disabled and are not submitted for that player.</p>
            </div>

            <div className="space-y-6">
              {participants.map((participant) => {
                const currentValue = feedbackForm[participant.id.content] || createDefaultFeedbackValue();

                return (
                  <Card key={participant.id.content} className="border-border/60">
                    <CardHeader>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <CardTitle className="text-lg">{participant.name}</CardTitle>
                          <CardDescription>
                            {participant.isHost ? 'Host' : 'Player'}
                            {participant.existingFeedback ? ' · Existing feedback loaded' : ''}
                          </CardDescription>
                        </div>

                        <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground">
                          <Checkbox
                            checked={currentValue.noShow}
                            onCheckedChange={(checked) => {
                              updateFeedbackValue(participant.id.content, (current) => ({
                                ...current,
                                noShow: Boolean(checked),
                                ...(checked
                                  ? {
                                      punctualStatus: '',
                                      teamPlayerScore: '',
                                      paymentScore: '',
                                      skillLevel: '',
                                    }
                                  : {}),
                              }));
                            }}
                            id={`no-show-${participant.id.content}`}
                          />
                          <Label htmlFor={`no-show-${participant.id.content}`} className="cursor-pointer">
                            Mark as no-show
                          </Label>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-6">
                      <div className="space-y-3">
                        <Label>Punctuality</Label>
                        <RadioGroup
                          value={currentValue.punctualStatus}
                          onValueChange={(value) => {
                            updateFeedbackValue(participant.id.content, (current) => ({
                              ...current,
                              punctualStatus: value as PunctualityOption,
                            }));
                          }}
                          className="grid grid-cols-2 gap-3"
                          disabled={currentValue.noShow}
                        >
                          {['Punctual', 'Late'].map((option) => (
                            <Label
                              key={option}
                              className={`flex items-center gap-3 rounded-lg border p-3 ${currentValue.noShow ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                            >
                              <RadioGroupItem value={option} disabled={currentValue.noShow} />
                              <span>{option}</span>
                            </Label>
                          ))}
                        </RadioGroup>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Team player</Label>
                          <Select
                            value={currentValue.teamPlayerScore}
                            onValueChange={(value) => {
                              updateFeedbackValue(participant.id.content, (current) => ({
                                ...current,
                                teamPlayerScore: value as ScoreOption,
                              }));
                            }}
                            disabled={currentValue.noShow}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select rating" />
                            </SelectTrigger>
                            <SelectContent>
                              {SCORE_OPTIONS.map((option) => (
                                <SelectItem key={`team-${option.value}`} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Particular on payment</Label>
                          <Select
                            value={currentValue.paymentScore}
                            onValueChange={(value) => {
                              updateFeedbackValue(participant.id.content, (current) => ({
                                ...current,
                                paymentScore: value as ScoreOption,
                              }));
                            }}
                            disabled={currentValue.noShow}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select rating" />
                            </SelectTrigger>
                            <SelectContent>
                              {SCORE_OPTIONS.map((option) => (
                                <SelectItem key={`payment-${option.value}`} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Skill level</Label>
                          <Select
                            value={currentValue.skillLevel}
                            onValueChange={(value) => {
                              updateFeedbackValue(participant.id.content, (current) => ({
                                ...current,
                                skillLevel: value as SkillLevelOption,
                              }));
                            }}
                            disabled={currentValue.noShow}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select skill level" />
                            </SelectTrigger>
                            <SelectContent>
                              {SKILL_LEVEL_OPTIONS.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => navigate('/my-hosted')}>
                Cancel
              </Button>
              <Button onClick={submitFeedback} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : 'Save Anonymous Feedback'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}