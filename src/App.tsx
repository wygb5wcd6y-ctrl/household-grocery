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
      fetchItems()
    }
  }

  async function toggleBought(id: string, currentStatus: string | null) {
    const newStatus = currentStatus === 'bought' ? null : 'bought'
    const { error } = await supabase
      .from('grocery_items')
      .update({ status: newStatus })
      .eq('id', id)

    if (error) console.error('Error updating item:', error)
    else fetchItems()
  }

  async function deleteItem(id: string) {
    const { error } = await supabase
      .from('grocery_items')
      .delete()
      .eq('id', id)

    if (error) console.error('Error deleting item:', error)
    else fetchItems()
  }

  async function signOut() {
    await supabase.auth.signOut()
    setSelectedHousehold(null)
    setItems([])
  }

  if (loading) return <p style={{ textAlign: 'center', marginTop: '100px' }}>Loading...</p>
  if (!user) return <Auth />

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '20px', fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h1 style={{ margin: 0 }}>🛒 Grocery List</h1>
        <button 
          onClick={signOut}
          style={{ padding: '8px 12px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
        >
          Sign Out
        </button>
      </div>

      <p style={{ color: '#666', marginBottom: '15px' }}>Signed in as {user.email}</p>

      <HouseholdSelector
        userId={user.id}
        selectedHousehold={selectedHousehold}
        onSelect={setSelectedHousehold}
      />

      {selectedHousehold ? (
        <>
          <form onSubmit={addItem} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <input
              type="text"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="Add an item..."
              style={{ flex: 1, padding: '10px', fontSize: '16px', borderRadius: '6px', border: '1px solid #ccc' }}
            />
            <button type="submit" style={{ padding: '10px 20px', fontSize: '16px', backgroundColor: '#22c55e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              Add
            </button>
          </form>

          <ul style={{ listStyle: 'none', padding: 0 }}>
            {items.length === 0 && <p style={{ color: '#888' }}>No items yet. Add something!</p>}
            {items.map((item) => (
              <li key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderBottom: '1px solid #eee' }}>
                <input
                  type="checkbox"
                  checked={item.status === 'bought'}
                  onChange={() => toggleBought(item.id, item.status)}
                  style={{ width: '20px', height: '20px' }}
                />
                <span style={{ flex: 1, textDecoration: item.status === 'bought' ? 'line-through' : 'none', color: item.status === 'bought' ? '#888' : 'inherit' }}>
                  {item.name}
                </span>
                <button onClick={() => deleteItem(item.id)} style={{ padding: '5px 10px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p style={{ textAlign: 'center', color: '#666' }}>Create or select a household to see your grocery list.</p>
      )}
    </div>
  )
}

export default App