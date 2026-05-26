import MarketplaceDetailClient from "../../../components/MarketplaceDetailClient";

type MarketplaceDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function MarketplaceDetailPage({
  params,
}: MarketplaceDetailPageProps) {
  const { id } = await params;
  return <MarketplaceDetailClient itemId={id} />;
}
