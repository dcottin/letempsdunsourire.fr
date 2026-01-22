import { supabase } from "./supabase"

export type Notification = {
    id: string
    created_at: string
    message: string
    type: string
    is_read: boolean
    document_id: string
    document_type: string
}

export async function getNotifications() {
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)

    if (error) {
        console.error('Error fetching notifications:', error)
        return []
    }
    return data as Notification[]
}

export async function markAsRead(id: string) {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)

    if (error) {
        console.error('Error marking notification as read:', error)
    }
}

export async function createNotification(notification: Omit<Notification, 'id' | 'created_at' | 'is_read'>) {
    const { error } = await supabase
        .from('notifications')
        .insert([notification])

    if (error) {
        console.error('Error creating notification:', error)
    }
}
