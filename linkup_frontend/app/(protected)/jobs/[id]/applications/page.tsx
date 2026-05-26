import JobApplicationsClient from "../../../../components/JobApplicationsClient";

type JobApplicationsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function JobApplicationsPage({
  params,
}: JobApplicationsPageProps) {
  const { id } = await params;
  return <JobApplicationsClient jobId={id} />;
}
