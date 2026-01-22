"use client"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { LogOutIcon } from "lucide-react"
import { logout } from "@/app/(auth)/login/actions"
import { NotificationBell } from "@/components/notification-bell"
import { SaveIndicator } from "@/components/save-indicator"

export function SiteHeader() {
    return (
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
            <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
                <SidebarTrigger className="-ml-1 md:hidden" />
                <div className="ml-auto flex items-center gap-2 lg:gap-4">
                    <SaveIndicator />
                    <NotificationBell />
                    <Separator orientation="vertical" className="h-4" />
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-500 hover:text-red-600 hover:bg-red-50 gap-2 h-8"
                        onClick={() => logout()}
                    >
                        <LogOutIcon className="size-4" />
                        <span className="hidden sm:inline font-medium">Se déconnecter</span>
                    </Button>
                </div>
            </div>
        </header>
    )
}
