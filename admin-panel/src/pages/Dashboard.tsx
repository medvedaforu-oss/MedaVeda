import LookupStatus from "../components/LookupStatus";
import { useState } from "react";

import useDashboard from "../hooks/useDashboard";
import useCourses from "../hooks/useCourses";

import StatCard from "../components/StatCard";
import CoursePicker from "../components/CoursePicker";

export default function Dashboard() {
  const { courses, loading: coursesLoading, error: coursesError, reload: reloadCourses } = useCourses();
  const [courseFilter, setCourseFilter] = useState("");
  const { stats, errors, loading } = useDashboard({ courseId: courseFilter || undefined });

  const filterBar = (
    <div className="mb-6 w-56">
      <LookupStatus label="courses" loading={coursesLoading} error={coursesError} onRetry={reloadCourses} />
      <CoursePicker
        courses={courses}
        value={courseFilter}
        onChange={setCourseFilter}
        label=""
        placeholder="All Courses"
      />
    </div>
  );


  if (loading) {
    return (
      <div>
        {filterBar}
        <h2 className="text-xl">Loading...</h2>
      </div>
    );
  }

  return (
    <div>
      {filterBar}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Courses"
          value={errors.courses ? "-" : String(stats.courses)}
          error={errors.courses}
          icon="🎓"
          color="#0891b2"
        />
        <StatCard
          title="Academic Years"
          value={errors.years ? "-" : String(stats.years)}
          error={errors.years}
          icon="📘"
          color="#16a34a"
        />
        <StatCard
          title="Subjects"
          value={errors.subjects ? "-" : String(stats.subjects)}
          error={errors.subjects}
          icon="📚"
          color="#2563eb"
        />
        <StatCard
          title="Products"
          value={errors.products ? "-" : String(stats.products)}
          error={errors.products}
          icon="📦"
          color="#ea580c"
        />
        <StatCard
          title="Students"
          value={errors.users ? "-" : String(stats.users)}
          error={errors.users}
          icon="👥"
          color="#9333ea"
        />
        <StatCard
          title="Notes"
          value={errors.notes ? "-" : String(stats.notes)}
          error={errors.notes}
          icon="📝"
          color="#0d9488"
        />
        <StatCard
          title="Videos"
          value={errors.videos ? "-" : String(stats.videos)}
          error={errors.videos}
          icon="🎬"
          color="#dc2626"
        />
        <StatCard
          title="Quiz Tests"
          value={errors.quiz ? "-" : String(stats.quiz)}
          error={errors.quiz}
          icon="❓"
          color="#d97706"
        />
      </div>
    </div>
  );
}
