import { useState, useMemo } from "react";
import { store } from "@/lib/mock-data";
import { useAuth } from "@/lib/auth-context";
import {
  COLLEGE_STREAMS, COLLEGE_PIPELINE_STAGES, COLLEGE_PROGRAM_TYPES, COLLEGE_COURSES_OFFERED,
  COLLEGE_PROGRAM_DURATIONS, COLLEGE_TRAINING_MODES, COLLEGE_ENROLLMENT_MODES,
  COLLEGE_REVENUE_MODELS, COLLEGE_STUDENT_CATEGORIES, COLLEGE_ENROLLMENT_SOURCES,
  SCHOOL_CLASSES, SCHOOL_COURSES, SCHOOL_TRAINING_SCHEDULES, SCHOOL_FEE_MODELS,
  SCHOOL_PIPELINE_STAGES, INTERNSHIP_PIPELINE_STAGES,
} from "@/lib/vertical-schema";
import type {
  CollegeAccount, CollegeProgram, CollegePipelineStage, CollegeStream,
  SchoolAccount, SchoolProgram, SchoolPipelineStage, SchoolClass,
} from "@/lib/vertical-types";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Building2, School, Users, Target, Calendar, Plus, TrendingUp,
  DollarSign, GraduationCap, Handshake, MapPin, Phone, Mail, BarChart3,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const CHART_COLORS = ["hsl(358, 78%, 51%)", "hsl(38, 92%, 50%)", "hsl(142, 71%, 45%)", "hsl(220, 70%, 55%)", "hsl(280, 60%, 55%)", "hsl(180, 60%, 45%)"];

function StageBadge({ stage, type }: { stage: string; type: "college" | "school" }) {
  const green = ["Agreement Signed", "Program Launch"];
  const yellow = ["Proposal Shared", "Negotiation", "Meeting Scheduled"];
  const cls = green.includes(stage) ? "bg-success/10 text-success" : yellow.includes(stage) ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground";
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{stage}</span>;
}

export default function InstitutionalSalesPage() {
  const [tab, setTab] = useState("colleges");
  const [showAddCollege, setShowAddCollege] = useState(false);
  const [showAddSchool, setShowAddSchool] = useState(false);

  const collegeAccounts = store.getCollegeAccounts();
  const collegePrograms = store.getCollegePrograms();
  const collegeStudents = store.getCollegeStudents();
  const schoolAccounts = store.getSchoolAccounts();
  const schoolPrograms = store.getSchoolPrograms();
  const schoolStudents = store.getSchoolStudents();
  const internshipAdmissions = store.getInternshipAdmissions();
  const leads = store.getLeads();

  const internshipLeads = leads.filter(l => l.programChannel === "Internship Program");

  // College metrics
  const collegeRevenue = collegePrograms.reduce((s, p) => s + (p.totalRevenue || 0), 0);
  const collegeStudentCount = collegePrograms.reduce((s, p) => s + p.totalStudentsEnrolled, 0);
  const collegeSigned = collegeAccounts.filter(c => c.pipelineStage === "Agreement Signed" || c.pipelineStage === "Program Launch").length;

  // School metrics
  const schoolRevenue = schoolPrograms.reduce((s, p) => s + (p.totalRevenue || 0), 0);
  const schoolStudentCount = schoolPrograms.reduce((s, p) => s + p.totalStudentsEnrolled, 0);
  const schoolSigned = schoolAccounts.filter(s => s.pipelineStage === "Agreement Signed" || s.pipelineStage === "Program Launch").length;

  // Internship metrics
  const internshipRevenue = internshipAdmissions.reduce((s, a) => s + (a.fee || 0), 0);

  // Pipeline data
  const collegePipelineData = useMemo(() => {
    return COLLEGE_PIPELINE_STAGES.map(stage => ({
      stage: stage.replace("College ", ""),
      count: collegeAccounts.filter(c => c.pipelineStage === stage).length,
    }));
  }, [collegeAccounts]);

  const schoolPipelineData = useMemo(() => {
    return SCHOOL_PIPELINE_STAGES.map(stage => ({
      stage: stage.replace("School ", ""),
      count: schoolAccounts.filter(s => s.pipelineStage === stage).length,
    }));
  }, [schoolAccounts]);

  const handleAddCollege = (college: CollegeAccount) => {
    const all = [...collegeAccounts, college];
    store.saveCollegeAccounts(all);
    setShowAddCollege(false);
    toast.success("College account added.");
  };

  const handleAddSchool = (school: SchoolAccount) => {
    const all = [...schoolAccounts, school];
    store.saveSchoolAccounts(all);
    setShowAddSchool(false);
    toast.success("School account added.");
  };

  const handleCollegeStageChange = (id: string, stage: CollegePipelineStage) => {
    const updated = collegeAccounts.map(c => c.id === id ? { ...c, pipelineStage: stage } : c);
    store.saveCollegeAccounts(updated);
    toast.success("Pipeline stage updated.");
  };

  const handleSchoolStageChange = (id: string, stage: SchoolPipelineStage) => {
    const updated = schoolAccounts.map(s => s.id === id ? { ...s, pipelineStage: stage } : s);
    store.saveSchoolAccounts(updated);
    toast.success("Pipeline stage updated.");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Institutional Sales</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">College Collaborations, School Programs & Internships</p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard title="Colleges" value={collegeAccounts.length} icon={<Building2 className="h-5 w-5" />} />
        <StatCard title="Schools" value={schoolAccounts.length} icon={<School className="h-5 w-5" />} />
        <StatCard title="Internship Leads" value={internshipLeads.length} icon={<GraduationCap className="h-5 w-5" />} />
        <StatCard title="College Revenue" value={`₹${(collegeRevenue / 1000).toFixed(0)}k`} icon={<DollarSign className="h-5 w-5" />} />
        <StatCard title="School Revenue" value={`₹${(schoolRevenue / 1000).toFixed(0)}k`} icon={<DollarSign className="h-5 w-5" />} />
        <StatCard title="Internship Revenue" value={`₹${(internshipRevenue / 1000).toFixed(0)}k`} icon={<TrendingUp className="h-5 w-5" />} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="overflow-x-auto flex-nowrap w-full">
          <TabsTrigger value="colleges" className="flex-1 text-xs">College Programs</TabsTrigger>
          <TabsTrigger value="schools" className="flex-1 text-xs">School Programs</TabsTrigger>
          <TabsTrigger value="internships" className="flex-1 text-xs">Internships</TabsTrigger>
          <TabsTrigger value="analytics" className="flex-1 text-xs">Analytics</TabsTrigger>
        </TabsList>

        {/* ── COLLEGES TAB ── */}
        <TabsContent value="colleges" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">College Accounts</h3>
            <Button size="sm" onClick={() => setShowAddCollege(true)}><Plus className="mr-1 h-4 w-4" /> <span className="hidden sm:inline">Add College</span></Button>
          </div>

          {/* Pipeline */}
          <div className="rounded-xl bg-card p-5 shadow-card">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Institutional Pipeline</h4>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={collegePipelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="stage" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="count" name="Colleges" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Account cards */}
          <div className="space-y-3">
            {collegeAccounts.map(college => {
              const programs = collegePrograms.filter(p => p.collegeAccountId === college.id);
              const rev = programs.reduce((s, p) => s + (p.totalRevenue || 0), 0);
              const students = programs.reduce((s, p) => s + p.totalStudentsEnrolled, 0);
              return (
                <div key={college.id} className="rounded-xl bg-card p-5 shadow-card">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary" />
                        <h4 className="text-sm font-semibold text-card-foreground">{college.collegeName}</h4>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{college.city}, {college.state} · {college.contactPersonName} ({college.designation})</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StageBadge stage={college.pipelineStage} type="college" />
                      <Select value={college.pipelineStage} onValueChange={(v) => handleCollegeStageChange(college.id, v as CollegePipelineStage)}>
                        <SelectTrigger className="h-7 w-36 text-[10px]"><SelectValue /></SelectTrigger>
                        <SelectContent>{COLLEGE_PIPELINE_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div><span className="text-muted-foreground">Students:</span> <span className="font-semibold text-card-foreground">{college.totalStudentStrength}</span></div>
                    <div><span className="text-muted-foreground">Streams:</span> <span className="font-medium text-card-foreground">{college.streamsOffered.join(", ")}</span></div>
                    <div><span className="text-muted-foreground">Programs:</span> <span className="font-semibold text-card-foreground">{programs.length}</span></div>
                    <div><span className="text-muted-foreground">Revenue:</span> <span className="font-semibold text-success">₹{rev.toLocaleString()}</span></div>
                  </div>
                  {programs.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {programs.map(p => (
                        <div key={p.id} className="flex items-center justify-between rounded-lg border p-2 text-xs">
                          <div>
                            <span className="font-medium text-card-foreground">{p.courseOffered}</span>
                            <span className="text-muted-foreground ml-2">· {p.programType} · {p.programDuration}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[9px]">{p.enrollmentMode.split("(")[0].trim()}</Badge>
                            <Badge variant="outline" className="text-[9px]">{p.revenueModel}</Badge>
                            <span className="font-semibold text-success">₹{(p.totalRevenue || 0).toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* ── SCHOOLS TAB ── */}
        <TabsContent value="schools" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">School Accounts</h3>
            <Button size="sm" onClick={() => setShowAddSchool(true)}><Plus className="mr-1 h-4 w-4" /> <span className="hidden sm:inline">Add School</span></Button>
          </div>

          <div className="rounded-xl bg-card p-5 shadow-card">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">School Pipeline</h4>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={schoolPipelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="stage" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="count" name="Schools" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-3">
            {schoolAccounts.map(school => {
              const programs = schoolPrograms.filter(p => p.schoolAccountId === school.id);
              const rev = programs.reduce((s, p) => s + (p.totalRevenue || 0), 0);
              const students = programs.reduce((s, p) => s + p.totalStudentsEnrolled, 0);
              return (
                <div key={school.id} className="rounded-xl bg-card p-5 shadow-card">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <School className="h-4 w-4 text-primary" />
                        <h4 className="text-sm font-semibold text-card-foreground">{school.schoolName}</h4>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{school.city} · {school.contactPersonName} ({school.designation})</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StageBadge stage={school.pipelineStage} type="school" />
                      <Select value={school.pipelineStage} onValueChange={(v) => handleSchoolStageChange(school.id, v as SchoolPipelineStage)}>
                        <SelectTrigger className="h-7 w-36 text-[10px]"><SelectValue /></SelectTrigger>
                        <SelectContent>{SCHOOL_PIPELINE_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div><span className="text-muted-foreground">Total Students:</span> <span className="font-semibold text-card-foreground">{school.totalStudents}</span></div>
                    <div><span className="text-muted-foreground">Classes:</span> <span className="font-medium text-card-foreground">{school.classCoverage.join(", ")}</span></div>
                    <div><span className="text-muted-foreground">Programs:</span> <span className="font-semibold text-card-foreground">{programs.length}</span></div>
                    <div><span className="text-muted-foreground">Revenue:</span> <span className="font-semibold text-success">₹{rev.toLocaleString()}</span></div>
                  </div>
                  {programs.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {programs.map(p => (
                        <div key={p.id} className="flex items-center justify-between rounded-lg border p-2 text-xs">
                          <div>
                            <span className="font-medium text-card-foreground">{p.courseOffered}</span>
                            <span className="text-muted-foreground ml-2">· {p.classCoverage.join(", ")} · {p.trainingSchedule}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[9px]">{p.feeModel}</Badge>
                            <span className="font-semibold text-success">₹{(p.totalRevenue || 0).toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* ── INTERNSHIPS TAB ── */}
        <TabsContent value="internships" className="space-y-4 mt-4">
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
            <StatCard title="Internship Leads" value={internshipLeads.length} icon={<Users className="h-5 w-5" />} />
            <StatCard title="Admissions" value={internshipAdmissions.length} icon={<GraduationCap className="h-5 w-5" />} />
            <StatCard title="Revenue" value={`₹${internshipRevenue.toLocaleString()}`} icon={<DollarSign className="h-5 w-5" />} />
            <StatCard title="Avg Batch Size" value={internshipAdmissions.length > 0 ? Math.round(internshipAdmissions.length / new Set(internshipAdmissions.map(a => a.batchName)).size) : 0} icon={<Target className="h-5 w-5" />} />
          </div>

          {/* Internship Pipeline */}
          <div className="rounded-xl bg-card p-5 shadow-card">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Internship Pipeline</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {INTERNSHIP_PIPELINE_STAGES.map(stage => {
                const count = internshipLeads.filter(l => l.internshipPipelineStage === stage).length;
                return (
                  <div key={stage} className="rounded-lg border p-3 text-center">
                    <p className="text-[10px] text-muted-foreground">{stage}</p>
                    <p className="mt-1 text-xl font-bold text-card-foreground">{count}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Internship Admissions */}
          <div className="rounded-xl bg-card p-5 shadow-card">
            <h4 className="text-sm font-semibold text-card-foreground mb-3">Internship Admissions</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Student</th>
                    <th className="pb-2 font-medium">Course</th>
                    <th className="pb-2 font-medium">Duration</th>
                    <th className="pb-2 font-medium">Location</th>
                    <th className="pb-2 font-medium text-right">Fee</th>
                    <th className="pb-2 font-medium">Batch</th>
                  </tr>
                </thead>
                <tbody>
                  {internshipAdmissions.map(a => (
                    <tr key={a.id} className="border-b last:border-0">
                      <td className="py-2 font-medium text-card-foreground">{a.studentName}</td>
                      <td className="py-2 text-muted-foreground">{a.internshipCourse}</td>
                      <td className="py-2 text-muted-foreground">{a.internshipDuration}</td>
                      <td className="py-2 text-muted-foreground">{a.internshipLocation}</td>
                      <td className="py-2 text-right text-success">₹{a.fee.toLocaleString()}</td>
                      <td className="py-2"><Badge variant="outline" className="text-[10px]">{a.batchName}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ── ANALYTICS TAB ── */}
        <TabsContent value="analytics" className="space-y-4 mt-4">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Revenue by channel */}
            <div className="rounded-xl bg-card p-5 shadow-card">
              <h4 className="text-sm font-semibold text-card-foreground mb-3">Revenue by Vertical</h4>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={[
                    { name: "Individual Admissions", value: store.getAdmissions().reduce((s, a) => s + (a.totalFee || 0), 0) },
                    { name: "Internships", value: internshipRevenue },
                    { name: "College Programs", value: collegeRevenue },
                    { name: "School Programs", value: schoolRevenue },
                  ]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name.split(" ")[0]}: ₹${(value / 1000).toFixed(0)}k`}>
                    {[0, 1, 2, 3].map(i => <Cell key={i} fill={CHART_COLORS[i]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(v: number) => `₹${v.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Student enrollment summary */}
            <div className="rounded-xl bg-card p-5 shadow-card">
              <h4 className="text-sm font-semibold text-card-foreground mb-3">Enrollment Summary</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-2"><GraduationCap className="h-4 w-4 text-primary" /><span className="text-sm font-medium text-card-foreground">Individual Admissions</span></div>
                  <span className="font-bold text-lg text-card-foreground">{store.getAdmissions().length}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-2"><Handshake className="h-4 w-4 text-primary" /><span className="text-sm font-medium text-card-foreground">Internship Students</span></div>
                  <span className="font-bold text-lg text-card-foreground">{internshipAdmissions.length}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /><span className="text-sm font-medium text-card-foreground">College Students</span></div>
                  <span className="font-bold text-lg text-card-foreground">{collegeStudentCount}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-2"><School className="h-4 w-4 text-primary" /><span className="text-sm font-medium text-card-foreground">School Students</span></div>
                  <span className="font-bold text-lg text-card-foreground">{schoolStudentCount}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="font-semibold text-card-foreground">Total Revenue</span>
                  <span className="text-lg font-bold text-primary">₹{(store.getAdmissions().reduce((s, a) => s + (a.totalFee || 0), 0) + internshipRevenue + collegeRevenue + schoolRevenue).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── ADD COLLEGE DIALOG ── */}
      <Dialog open={showAddCollege} onOpenChange={setShowAddCollege}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add College Account</DialogTitle></DialogHeader>
          <CollegeForm onSave={handleAddCollege} onCancel={() => setShowAddCollege(false)} />
        </DialogContent>
      </Dialog>

      {/* ── ADD SCHOOL DIALOG ── */}
      <Dialog open={showAddSchool} onOpenChange={setShowAddSchool}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add School Account</DialogTitle></DialogHeader>
          <SchoolForm onSave={handleAddSchool} onCancel={() => setShowAddSchool(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── College Form ──
function CollegeForm({ onSave, onCancel }: { onSave: (c: CollegeAccount) => void; onCancel: () => void }) {
  const [form, setForm] = useState({ collegeName: "", city: "", state: "", contactPersonName: "", designation: "", phone: "", email: "", totalStudentStrength: "", notes: "" });
  const [streams, setStreams] = useState<CollegeStream[]>([]);
  const [stage, setStage] = useState<CollegePipelineStage>("College Identified");

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = () => {
    if (!form.collegeName || !form.city || !form.contactPersonName || !form.phone) {
      toast.error("Please fill in all required fields.");
      return;
    }
    onSave({
      id: `col${Date.now()}`, ...form, totalStudentStrength: parseInt(form.totalStudentStrength) || 0,
      streamsOffered: streams, pipelineStage: stage, createdAt: new Date().toISOString().split("T")[0],
    });
  };

  return (
    <div className="space-y-4 pt-2">
      <div className="grid grid-cols-2 gap-3">
        <div><Label>College Name *</Label><Input value={form.collegeName} onChange={e => set("collegeName", e.target.value)} placeholder="Enter college name" /></div>
        <div><Label>City *</Label><Input value={form.city} onChange={e => set("city", e.target.value)} placeholder="City" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>State</Label><Input value={form.state} onChange={e => set("state", e.target.value)} placeholder="State" /></div>
        <div><Label>Student Strength</Label><Input type="number" value={form.totalStudentStrength} onChange={e => set("totalStudentStrength", e.target.value)} placeholder="Total students" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Contact Person *</Label><Input value={form.contactPersonName} onChange={e => set("contactPersonName", e.target.value)} placeholder="Contact name" /></div>
        <div><Label>Designation</Label><Input value={form.designation} onChange={e => set("designation", e.target.value)} placeholder="e.g. Dean" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Phone *</Label><Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="Phone number" /></div>
        <div><Label>Email</Label><Input value={form.email} onChange={e => set("email", e.target.value)} placeholder="Email" /></div>
      </div>
      <div>
        <Label>Streams Offered</Label>
        <div className="flex flex-wrap gap-2 mt-1">
          {COLLEGE_STREAMS.map(s => (
            <label key={s} className="flex items-center gap-1.5 text-xs">
              <Checkbox checked={streams.includes(s)} onCheckedChange={c => setStreams(c ? [...streams, s] : streams.filter(x => x !== s))} />
              {s}
            </label>
          ))}
        </div>
      </div>
      <div>
        <Label>Pipeline Stage</Label>
        <Select value={stage} onValueChange={v => setStage(v as CollegePipelineStage)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{COLLEGE_PIPELINE_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Any additional notes..." rows={2} /></div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={handleSubmit}>Save College</Button>
      </div>
    </div>
  );
}

// ── School Form ──
function SchoolForm({ onSave, onCancel }: { onSave: (s: SchoolAccount) => void; onCancel: () => void }) {
  const [form, setForm] = useState({ schoolName: "", city: "", contactPersonName: "", designation: "", phone: "", email: "", totalStudents: "", notes: "" });
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [stage, setStage] = useState<SchoolPipelineStage>("School Identified");

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = () => {
    if (!form.schoolName || !form.city || !form.contactPersonName || !form.phone) {
      toast.error("Please fill in all required fields.");
      return;
    }
    onSave({
      id: `sch${Date.now()}`, ...form, totalStudents: parseInt(form.totalStudents) || 0,
      classCoverage: classes, pipelineStage: stage, createdAt: new Date().toISOString().split("T")[0],
    });
  };

  return (
    <div className="space-y-4 pt-2">
      <div className="grid grid-cols-2 gap-3">
        <div><Label>School Name *</Label><Input value={form.schoolName} onChange={e => set("schoolName", e.target.value)} placeholder="School name" /></div>
        <div><Label>City *</Label><Input value={form.city} onChange={e => set("city", e.target.value)} placeholder="City" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Contact Person *</Label><Input value={form.contactPersonName} onChange={e => set("contactPersonName", e.target.value)} placeholder="Contact name" /></div>
        <div><Label>Designation</Label><Input value={form.designation} onChange={e => set("designation", e.target.value)} placeholder="e.g. Principal" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Phone *</Label><Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="Phone number" /></div>
        <div><Label>Email</Label><Input value={form.email} onChange={e => set("email", e.target.value)} placeholder="Email" /></div>
      </div>
      <div><Label>Total Students (Class 5-12)</Label><Input type="number" value={form.totalStudents} onChange={e => set("totalStudents", e.target.value)} placeholder="Total students" /></div>
      <div>
        <Label>Class Coverage</Label>
        <div className="flex flex-wrap gap-2 mt-1">
          {SCHOOL_CLASSES.map(c => (
            <label key={c} className="flex items-center gap-1.5 text-xs">
              <Checkbox checked={classes.includes(c)} onCheckedChange={ch => setClasses(ch ? [...classes, c] : classes.filter(x => x !== c))} />
              {c}
            </label>
          ))}
        </div>
      </div>
      <div>
        <Label>Pipeline Stage</Label>
        <Select value={stage} onValueChange={v => setStage(v as SchoolPipelineStage)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{SCHOOL_PIPELINE_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Any additional notes..." rows={2} /></div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={handleSubmit}>Save School</Button>
      </div>
    </div>
  );
}
