import CategoriesClient from "./categories-client";

export const metadata = {
  title: "Exam Categories",
  description: "Browse various entrance exam categories.",
};

export default function ExamCategoryPage() {
  return <CategoriesClient />;
}
