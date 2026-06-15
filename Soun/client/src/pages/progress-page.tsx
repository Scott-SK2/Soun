import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Clock,
  Target,
  TrendingUp,
  Calendar,
  BookOpen,
  Award,
  BarChart3,
  PieChart
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as PieChartComponent, Pie, Cell } from "recharts";
import { MasteryDashboard } from "@/components/progress/mastery-dashboard";
import { MasteryPrediction } from "@/components/progress/mastery-prediction";

interface WeeklyProgress {
  day: string;
  minutes: number;
  isToday: boolean;
  isPast: boolean;
}

interface SubjectProgress {
  name: string;
  minutes: number;
  percentage: number;
}

interface ProgressSummary {
  total: number;
  percentChange: number;
  streakDays: number;
  weeklyGoal: number;
  weeklyGoalProgress: number;
}

interface MasteryData {
  courses: Array<{
    courseId: string;
    courseName: string;
    averageMastery: number;
    topicsStudied: number;
    accuracy: number;
    totalQuestionAttempts: number;
  }>;
  overallMastery: number;
  topicsStudied: number;
  mostStudiedCourse: {
    courseId: string;
    courseName: string;
    averageMastery: number;
    topicsStudied: number;
    accuracy: number;
    totalQuestionAttempts: number;
  };
}

interface TutorProgressDashboard {
  course_id: string;
  course_progress: number;
  course_status: string;
  study_time_sec: number;
  sessions_count: number;
  checks_completed: number;
  accuracy: number;
  strengths: any[];
  needs_practice: any[];
  concepts: Array<{
    concept_id: string;
    concept_title: string;
    mastery: number;
    status: string;
    attempts: number;
    good_answers: number;
    bad_answers: number;
  }>;
}
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function ProgressPage() {
  // Query for weekly progress
  const { data: weeklyData = [], isLoading: weeklyLoading } = useQuery<WeeklyProgress[]>({
    queryKey: ['/api/progress/weekly'],
    queryFn: async () => {
      const response = await fetch('/api/progress/weekly', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch weekly progress');
      return response.json();
    }
  });

  // Query for subject distribution
  const { data: subjectData = [], isLoading: subjectLoading } = useQuery<SubjectProgress[]>({
    queryKey: ['/api/progress/subjects'],
    queryFn: async () => {
      const response = await fetch('/api/progress/subjects', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch subject progress');
      return response.json();
    }
  });

  // Query for progress summary
  const { data: summary, isLoading: summaryLoading } = useQuery<ProgressSummary>({
    queryKey: ['/api/progress/summary'],
    queryFn: async () => {
      const response = await fetch('/api/progress/summary', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch progress summary');
      return response.json();
    }
  });

  // Query for mastery data
  const { data: masteryData, isLoading: masteryLoading } = useQuery<MasteryData>({
    queryKey: ['/api/user/mastery'],
    queryFn: async () => {
      const res = await fetch('/api/user/mastery');
      if (!res.ok) throw new Error('Failed to fetch mastery data');
      return res.json();
    }
  });

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const { data: tutorProgress, isLoading: tutorProgressLoading } = useQuery<TutorProgressDashboard>({
    queryKey: ['/api/tutor/progress-dashboard'],
    queryFn: async () => {
      const response = await fetch('/api/tutor/progress-dashboard', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch tutor progress dashboard');
      return response.json();
    }
  });

  const courseDistributionData = tutorProgress
  ? [
      {
        name: "Business Strategy",
        minutes: Math.max(1, Math.round(tutorProgress.study_time_sec / 60)),
        percentage: 100,
      },
    ]
  : [];

  const sortedConcepts = [...(tutorProgress?.concepts || [])].sort(
    (a, b) => a.mastery - b.mastery
  );

  return (
    <div className="container py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Study Progress</h1>
        <p className="text-muted-foreground mt-1">
          Track your learning journey and measure your academic growth
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="subjects">Subjects</TabsTrigger>
          <TabsTrigger value="mastery">Mastery</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Week</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {tutorProgress ? formatTime(Math.round(tutorProgress.study_time_sec / 60)) : '0m'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {tutorProgress?.sessions_count || 0} study sessions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Weekly Goal</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {
                  tutorProgress
                  ? Math.min(
                    100,
                    Math.round((tutorProgress.study_time_sec / 36000) * 100)
                  )
                : 0
              }%
                </div>
                <Progress
                value={
                  tutorProgress
                  ? Math.min(
                    100,
                    Math.round((tutorProgress.study_time_sec / 36000) * 100)
                  )
                : 0
              }
              className="mt-2"
            />
                <p className="text-xs text-muted-foreground mt-1">
                  Goal: '10h'
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sessions Completed</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {tutorProgress?.sessions_count || 0} sessions
                </div>
                <p className="text-xs text-muted-foreground">
                  Keep it up!
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overall Mastery</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {tutorProgress?.course_progress || 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {tutorProgress?.concepts?.length || 0} concepts studied
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weekly Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Weekly Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip formatter={(value) => [formatTime(value as number), 'Study Time']} />
                    <Bar dataKey="minutes" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Subject Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="h-5 w-5 mr-2" />
                  Course Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChartComponent>
                    <Pie
                      data={courseDistributionData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="minutes"
                      label={({ name, percentage }) => `${name}: ${percentage}%`}
                    >
                      {courseDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [formatTime(value as number), 'Study Time']} />
                  </PieChartComponent>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="weekly" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Study Pattern</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-4">
                {weeklyData.map((day, index) => (
                  <div key={index} className="text-center">
                    <div className={`p-4 rounded-lg border ${
                      day.isToday ? 'bg-blue-50 border-blue-200' :
                      day.isPast ? 'bg-gray-50' : 'bg-white'
                    }`}>
                      <div className="font-semibold text-sm">{day.day}</div>
                      <div className="text-2xl font-bold mt-2">
                        {formatTime(day.minutes)}
                      </div>
                      {day.isToday && (
                        <Badge variant="secondary" className="mt-2 text-xs">Today</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subjects" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BookOpen className="h-5 w-5 mr-2" />
                Business Strategy
                </CardTitle>
                </CardHeader>
                
                <CardContent className="space-y-5">
                  {(tutorProgress?.concepts || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No concepts studied yet.
                    </p>
                  ) : (
                    sortedConcepts.map((concept) => (
                    <div key={concept.concept_id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{concept.concept_title}</p>
                          <p className="text-xs text-muted-foreground">
                            {concept.attempts} attempts ·
                            ✓{concept.good_answers} correct ·
                            ✗{concept.bad_answers} missed ·
                            {concept.status.replaceAll("_", " ")}
                          </p>
                        </div>
                        
                        <Badge variant={concept.mastery >= 75 ? "default" : concept.mastery >= 40 ? "secondary" : "destructive"}>
                          {concept.mastery}%
                        </Badge>
                      </div>
                      
                      <Progress value={concept.mastery} />
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

        <TabsContent value="mastery" className="space-y-6">
            <MasteryPrediction />
            <MasteryDashboard />
          </TabsContent>

        <TabsContent value="detailed" className="space-y-6">
        </TabsContent>
      </Tabs>
    </div>
  );
}