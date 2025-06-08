import UserHistoryClient from "./UserHistoryClient";

type Props = {
    params: Promise<{
        id: string;
    }>;
};

export default async function UserHistoryPage({ params }: Props) {
    const { id } = await params;
    
    return (
        <div className="space-y-4">
            <UserHistoryClient userId={id} />
        </div>
    );
}
