import SeriesClient from "./series-client";

export default async function SeriesPage({ params }) {
  const { categoryId } = await params;
  return <SeriesClient categoryId={categoryId} />;
}
