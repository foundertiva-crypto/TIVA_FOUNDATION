import { getServiceDetailMetrics } from "@/app/actions/service-metrics";
import { ServiceDetailView } from "@/components/admin/service-detail-view";
import { notFound } from "next/navigation";

interface Props {
    params: Promise<{ service: string }>;
}

export default async function ServiceDetailPage({ params }: Props) {
    const { service: slug } = await params;
    const metrics = await getServiceDetailMetrics(slug);

    if (!metrics) {
        notFound();
    }

    return <ServiceDetailView metrics={metrics} />;
}

export async function generateMetadata({ params }: Props) {
    const { service: slug } = await params;
    const name = slug
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    return {
        title: `${name} — Service Metrics | TIVA Admin`,
        description: `Detailed metrics and analytics for the ${name} service`,
    };
}
