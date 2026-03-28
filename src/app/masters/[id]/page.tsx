import { masters } from "@/lib/data"
import { notFound } from "next/navigation"
import { ClientMasterContent } from "./ClientMasterContent";

interface Props {
  params: { id: string }
}

// Generate static params for all masters
export function generateStaticParams() {
  return masters.map((master) => ({
    id: master.id,
  }))
}

export default function MasterDetailPage({ params }: Props) {
  const master = masters.find(m => m.id === params.id)
  
  if (!master) {
    notFound()
  }

  return (
    <ClientMasterContent master={master} />
  )
}