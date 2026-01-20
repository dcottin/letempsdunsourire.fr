"use client"

import * as React from "react"
import {
    LayersIcon,
    PlusCircleIcon,
    MailIcon,
    PanelLeftIcon,
    DatabaseIcon,
    MoreHorizontalIcon,
    FolderIcon,
    ShareIcon,
    TrashIcon,
    SettingsIcon,
    MoreVerticalIcon,
    UserCircleIcon,
    CreditCardIcon,
    BellIcon,
    LogOutIcon,
    MapIcon,
    CalendarIcon,
    Camera,
    EuroIcon,
} from "lucide-react"

import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuAction,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { logout } from "@/app/(auth)/login/actions"
import { supabase } from "@/lib/supabase"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const pathname = usePathname()
    const [companyName, setCompanyName] = React.useState("Chargement...")
    const [user, setUser] = React.useState<any>(null)

    React.useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                setUser({
                    name: user.user_metadata?.full_name || user.email?.split('@')[0] || "Admin",
                    email: user.email,
                    avatar: user.user_metadata?.avatar_url || ""
                })
            }
        }
        getUser()
    }, [])

    React.useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { data, error } = await supabase
                    .from('settings')
                    .select('data')
                    .limit(1)
                    .single()

                if (data?.data?.nom_societe) {
                    setCompanyName(data.data.nom_societe)
                } else {
                    setCompanyName("Mon Entreprise")
                }
            } catch (err) {
                console.error("Error fetching company name:", err)
                setCompanyName("Mon Entreprise")
            }
        }
        fetchSettings()
    }, [])

    const navMain = [
        {
            title: "Calendrier",
            url: "/calendrier",
            icon: CalendarIcon,
        },
        {
            title: "Statistiques",
            url: "/statistiques",
            icon: LayersIcon,
        },
        {
            title: "Finance",
            url: "/finance",
            icon: EuroIcon,
        },
        {
            title: "Contrats",
            url: "/devis-contrats",
            icon: PanelLeftIcon,
        },
    ]

    const navConfig = [
        {
            title: "Personnalisation",
            url: "/personnalisation",
            icon: SettingsIcon,
        },
        {
            title: "Matériels",
            url: "/materiel",
            icon: Camera,
        },
        {
            title: "Abonnement",
            url: "#",
            icon: CreditCardIcon,
        },
        {
            title: "Mon Profil",
            url: "#",
            icon: UserCircleIcon,
        },
    ]

    return (
        <Sidebar collapsible="icon" {...props} className="border-none shadow-xl">
            <SidebarHeader className="py-6 px-4">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            asChild
                            className="hover:bg-transparent active:bg-transparent"
                        >
                            <Link href="/">
                                <div className="flex aspect-square size-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/20">
                                    <Camera className="size-5" />
                                </div>
                                <div className="grid flex-1 text-left text-sm leading-tight ml-3">
                                    <span className="truncate font-bold text-base tracking-tight">{companyName}</span>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent className="px-2">
                <SidebarGroup>
                    <SidebarMenu>
                        {navMain.map((item) => (
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton
                                    asChild
                                    isActive={pathname === item.url}
                                    className="h-11 rounded-xl px-3 transition-colors hover:bg-white/10 data-[active=true]:bg-indigo-600 data-[active=true]:text-white data-[active=true]:shadow-lg data-[active=true]:shadow-indigo-600/20"
                                >
                                    <Link href={item.url} className="flex items-center gap-3">
                                        <item.icon className="size-5" />
                                        <span className="font-medium text-[15px]">{item.title}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarGroup>

                <SidebarGroup className="mt-4">
                    <SidebarGroupLabel className="px-3 text-white/40 font-bold tracking-widest text-[11px] mb-2">
                        CONFIGURATION
                    </SidebarGroupLabel>
                    <SidebarMenu>
                        {navConfig.map((item) => (
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton
                                    asChild
                                    isActive={pathname === item.url}
                                    className="h-11 rounded-xl px-3 transition-colors hover:bg-white/10 data-[active=true]:bg-indigo-600 data-[active=true]:text-white data-[active=true]:shadow-lg data-[active=true]:shadow-indigo-600/20"
                                >
                                    <Link href={item.url} className="flex items-center gap-3">
                                        <item.icon className="size-5" />
                                        <span className="font-medium text-[15px]">{item.title}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
                {user && <NavUser user={user} />}
            </SidebarFooter>
        </Sidebar>
    )
}

function NavMain({
    items,
    pathname,
}: {
    items: {
        title: string
        url: string
    }[]
    pathname: string
}) {
    return (
        <SidebarGroup>
            <SidebarGroupContent className="flex flex-col gap-2">
                <SidebarMenu>
                    {items.map((item) => (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                                tooltip={item.title}
                                asChild
                                isActive={pathname === item.url}
                            >
                                <Link href={item.url}>
                                    {item.title === "Devis & Contrats" && <PanelLeftIcon />}
                                    {item.title === "Statistiques" && <DatabaseIcon />}
                                    {item.title === "Finance" && <EuroIcon />}
                                    {item.title === "Planification" && <MapIcon />}
                                    {item.title === "Calendrier" && <CalendarIcon />}
                                    {item.title === "Personnalisation" && <SettingsIcon />}
                                    {item.title === "Matériel" && <Camera />}
                                    <span>{item.title}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    )
}

function NavDocuments({
    items,
}: {
    items: {
        name: string
        url: string
    }[]
}) {
    return (
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
            <SidebarGroupLabel>Documents</SidebarGroupLabel>
            <SidebarMenu>
                {items.map((item) => (
                    <SidebarMenuItem key={item.name}>
                        <SidebarMenuButton asChild>
                            <Link href={item.url}>
                                <DatabaseIcon
                                />
                                <span>{item.name}</span>
                            </Link>
                        </SidebarMenuButton>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <SidebarMenuAction
                                    showOnHover
                                    className="data-[state=open]:bg-accent rounded-sm"
                                >
                                    <MoreHorizontalIcon
                                    />
                                    <span className="sr-only">More</span>
                                </SidebarMenuAction>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-24 rounded-lg" align="end">
                                <DropdownMenuItem>
                                    <FolderIcon
                                    />
                                    <span>Open</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <ShareIcon
                                    />
                                    <span>Share</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem variant="destructive">
                                    <TrashIcon
                                    />
                                    <span>Delete</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarMenuItem>
                ))}
                <SidebarMenuItem>
                    <SidebarMenuButton className="text-sidebar-foreground/70">
                        <MoreHorizontalIcon className="text-sidebar-foreground/70" />
                        <span>More</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarGroup>
    )
}

function NavSecondary({
    items,
    ...props
}: {
    items: {
        title: string
        url: string
    }[]
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
    return (
        <SidebarGroup {...props}>
            <SidebarGroupContent>
                <SidebarMenu>
                    {items.map((item) => (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton asChild>
                                <Link href={item.url}>
                                    <SettingsIcon
                                    />
                                    <span>{item.title}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    )
}

function NavUser({
    user,
}: {
    user: {
        name: string
        email: string
        avatar: string
    }
}) {
    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        >
                            <Avatar className="h-8 w-8 rounded-lg grayscale">
                                <AvatarImage src={user.avatar} alt={user.name} />
                                <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                            </Avatar>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-medium">{user.name}</span>
                                <span className="text-muted-foreground truncate text-xs">
                                    {user.email}
                                </span>
                            </div>
                            <MoreVerticalIcon className="ml-auto size-4" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                        side="right"
                        align="end"
                        sideOffset={4}
                    >
                        <DropdownMenuLabel className="p-0 font-normal">
                            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                <Avatar className="h-8 w-8 rounded-lg">
                                    <AvatarImage src={user.avatar} alt={user.name} />
                                    <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                                </Avatar>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-medium">{user.name}</span>
                                    <span className="text-muted-foreground truncate text-xs">
                                        {user.email}
                                    </span>
                                </div>
                            </div>
                        </DropdownMenuLabel>

                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => logout()} className="text-red-600 focus:text-red-600 cursor-pointer">
                            <LogOutIcon />
                            Se déconnecter
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    )
}
