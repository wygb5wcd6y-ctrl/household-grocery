import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import type { User } from '@supabase/supabase-js'
import Auth from './Auth'
import HouseholdSelector from './HouseholdSelector'

interface GroceryItem {
  id: string
  name: string
  status: string | null
  created_at: string
  household_id: string
}

interface Household {
  id: string
  name: string
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [selectedHousehold, setSelectedHousehold] = useState<Household | null>(null)
  const [items, setItems] = useState<GroceryItem[]>([])
  const [newItem, setNewItem] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (selectedHousehold) {
      fetchItems()

      // Set up real-time subscription
      const channel = supabase
        .channel('grocery-changes')
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'grocery_items',
            filter: `household_id=eq.${selectedHousehold.id}`
          },
          (payload) => {
            console.log('Real-time update:', payload)
            
            if (payload.eventType === 'INSERT') {
              setItems(prev => [payload.new as GroceryItem, ...prev])
            } else if (payload.eventType === 'UPDATE') {
              setItems(prev => prev.map(item => 
                item.id === payload.new.id ? payload.new as GroceryItem : item
              ))
            } else if (payload.eventType === 'DELETE') {
              setItems(prev => prev.filter(item => item.id !== payload.old.id))
            }
          }
        )
        .subscribe((status) => {
  console.log('Subscription status:', status)
})

      // Cleanup subscription when household changes or component unmounts
      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [selectedHousehold])

  async function fetchItems() {
    if (!selectedHousehold) return

    const { data, error } = await supabase
      .from('grocery_items')
      .select('*')
      .eq('household_id', selectedHousehold.id)
      .order('created_at', { ascending: false })

    if (error) console.error('Error fetching items:', error)
    else setItems(data || [])
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault()
    if (!newItem.trim() || !selectedHousehold) return

    const { error } = await supabase
      .from('grocery_items')
      .insert([{ name: newItem.trim(), household_id: selectedHousehold.id }])

    if (error) console.error('Error adding item:', error)
    else {
      setNewItem('')
      // No need to fetchItems() - real-time will handle it!
    }
  }

  async function toggleBought(id: string, currentStatus: string | null) {
    const newStatus = currentStatus === 'bought' ? null : 'bought'
    const { error } = await supabase
      .from('grocery_items')
      .update({ status: newStatus })
      .eq('id', id)

    if (error) console.error('Error updating item:', error)
    // No need to fetchItems() - real-time will handle it!
  }

  async function deleteItem(id: string) {
    const { error } = await supabase
      .from('grocery_items')
      .delete()
      .eq('id', id)

    if (error) console.error('Error deleting item:', error)
    // No need to fetchItems() - real-time will handle it
