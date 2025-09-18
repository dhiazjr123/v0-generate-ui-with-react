"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, MessageSquare, Clock, Download, Trash2, TrendingUp } from "lucide-react"

export function MainContent() {
  const summaryStats = [
    { label: "Total Documents", value: "0", icon: FileText },
    { label: "Documents Generated", value: "0", icon: TrendingUp },
    { label: "Total Queries", value: "0", icon: MessageSquare },
  ]

  const recentQueries = [
    { query: "Summarize Q3 financial reports", time: "2 minutes ago" },
    { query: "Compare marketing strategies across regions", time: "15 minutes ago" },
    { query: "Extract key metrics from sales documents", time: "1 hour ago" },
  ]

  const documents = [
    {
      name: "Q3_Financial_Report.pdf",
      type: "PDF",
      size: "2.4 MB",
      uploadDate: "2024-12-09",
      status: "Processed",
    },
    {
      name: "Marketing_Strategy_2024.docx",
      type: "DOCX",
      size: "1.8 MB",
      uploadDate: "2024-12-08",
      status: "Processing",
    },
    {
      name: "Sales_Analysis_Nov.xlsx",
      type: "XLSX",
      size: "3.2 MB",
      uploadDate: "2024-12-07",
      status: "Processed",
    },
    {
      name: "Sales_Analysis_Nov.xlsx",
      type: "XLSX",
      size: "3.2 MB",
      uploadDate: "2024-12-07",
      status: "Processed",
    },
    {
      name: "Marketing_Strategy_2024.docx",
      type: "DOCX",
      size: "1.8 MB",
      uploadDate: "2024-12-08",
      status: "Processing",
    },
  ]

  return (
    <main className="flex-1 p-6 space-y-6 overflow-auto">
      {/* Summary Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {summaryStats.map((stat, index) => (
          <Card key={index} className="bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Queries Section */}
      <Card className="bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Queries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentQueries.map((query, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{query.query}</p>
                  <p className="text-xs text-muted-foreground">{query.time}</p>
                </div>
                <Button variant="ghost" size="sm">
                  View
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card className="bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Name</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Type</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Size</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Upload Date</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc, index) => (
                  <tr key={index} className="border-b border-border/50">
                    <td className="py-3 px-2 text-sm text-foreground">{doc.name}</td>
                    <td className="py-3 px-2">
                      <Badge variant="outline" className="text-xs">
                        {doc.type}
                      </Badge>
                    </td>
                    <td className="py-3 px-2 text-sm text-muted-foreground">{doc.size}</td>
                    <td className="py-3 px-2 text-sm text-muted-foreground">{doc.uploadDate}</td>
                    <td className="py-3 px-2">
                      <Badge variant={doc.status === "Processed" ? "default" : "secondary"} className="text-xs">
                        {doc.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
