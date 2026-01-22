import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function proxy(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const {
        data: { user },
    } = await supabase.auth.getUser()

    const isLoginPage = request.nextUrl.pathname === '/login'
    const isReservationPage = request.nextUrl.pathname.startsWith('/reservation')
    const isSignPage = request.nextUrl.pathname.startsWith('/sign')

    // Let reservation page, sign page, and static files pass
    if (isReservationPage || isSignPage) {
        return supabaseResponse
    }

    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'contact@letempsdunsourire.fr'

    // If not logged in and not on login page -> redirect to login
    if (!user && !isLoginPage) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // If logged in but not admin -> redirect to login with error
    if (user && user.email !== ADMIN_EMAIL && !isLoginPage) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('error', 'unauthorized')
        // We don't sign out here to avoid infinite loops if they try to go back, 
        // but the login page will handle showing the error.
        return NextResponse.redirect(url)
    }

    // If logged in as admin and on login page -> redirect to dashboard
    if (user && user.email === ADMIN_EMAIL && isLoginPage) {
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
