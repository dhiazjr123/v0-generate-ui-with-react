import { Header } from "@/components/header"
import { Sidebar } from "@/components/sidebar"
import { MainContent } from "@/components/main-content"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar />
        <MainContent />
      </div>
    </div>
  )
}
