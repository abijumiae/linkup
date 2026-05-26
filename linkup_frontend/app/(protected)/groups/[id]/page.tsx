import GroupDetailClient from "../../../components/GroupDetailClient";

type GroupDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function GroupDetailPage({ params }: GroupDetailPageProps) {
  const { id } = await params;
  return <GroupDetailClient groupId={id} />;
}
