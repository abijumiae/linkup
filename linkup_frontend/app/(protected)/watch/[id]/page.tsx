import WatchDetailClient from "../../../components/WatchDetailClient";

type WatchDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function WatchDetailPage({ params }: WatchDetailPageProps) {
  const { id } = await params;
  return <WatchDetailClient videoId={id} />;
}
