// page.tsx
import CopyHistorical from "./CopyHistorical";

interface CopyHistoricalPageWrapperProps {
    params: { id: string };
}
export default function CopyHistoricalPageWrapper({ params }: CopyHistoricalPageWrapperProps) {
    return (
        <div className="space-y-4">
            <CopyHistorical copyId={params.id} />
        </div>
    );
}
