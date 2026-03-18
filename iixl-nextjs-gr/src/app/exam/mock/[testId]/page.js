import ExamInterfaceClient from "./page-client";

export const metadata = {
  title: "Live Mock Exam",
  description: "Distraction-free mock exam UI with timer, palette, and adaptive tracking hooks.",
};

export default async function MockExamPage({ params }) {
  const { testId } = await params;
  return <ExamInterfaceClient testId={testId} />;
}
