import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

interface Household {
  id: string
  name: string
}

interface Props {
  userId: string
  selectedHousehold: Household | null
  onSelect: (household: Household) => void
}

export default function HouseholdSelector({ userId, selectedHousehold, onSelect }: Props) {
  const [households, setHouseholds] = useState<Household[]>([])
  const [newName, setNewName] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [joinCode, setJoinCode] = useState('')
  const [showJoin, setShowJoin] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    fetchHouseholds()
  }, [userId])

  async function fetchHouseholds() {
    const { data, error } = await supabase
      .from('household_members')
      .select('household_id, households(id, name)')
      .eq('user_id', userId)

    if (error) {
      console.error('Error fetching households:', error)
      return
    }

    const hh = data?.map((d: any) => d.households).filter(Boolean) || []
    setHouseholds(hh)

    if (hh.length > 0 && !selectedHousehold) {
      onSelect(hh[0])
    }
  }

  async function createHousehold(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return

    const { data: household, error: hhError } = await supabase
      .from('households')
      .insert([{ name: newName.trim() }])
      .select()
      .single()

    if (hhError) {
      console.error('Error creating household:', hhError)
      return
    }

    const { error: memberError } = await supabase
      .from('household_members')
      .insert([{ user_id: userId, household_id: household.id, role: 'owner' }])

    if (memberError) {
      console.error('Error adding membership:', memberError)
      return
    }

    setNewName('')
    setShowCreate(false)
    fetchHouseholds()
    onSelect(household)
  }

  async function generateInvite() {
    if (!selectedHousehold) return

    // Generate a random 8-character code
    const code = Math.random().toString(36).substring(2, 10).toUpperCase()

    const { error } = await supabase
      .from('household_invites')
      .insert([{
        household_id: selectedHousehold.id,
        invite_code: code,
        created_by: userId
      }])

    if (error) {
      console.error('Error creating invite:', error)
      setMessage('Failed to create invite')
    } else {
      setInviteCode(code)
      setMessage(null)
    }
  }

  async function joinHousehold(e: React.FormEvent) {
    e.preventDefault()
    if (!joinCode.trim()) return

    // Look up the invite
    const { data: invite, error: lookupError } = await supabase
      .from('household_invites')
      .select('household_id, expires_at, households(name)')
      .eq('invite_code', joinCode.trim().toUpperCase())
      .single()

    if (lookupError || !invite) {
      setMessage('Invalid invite code')
      return
    }

    // Check if expired
    if (new Date(invite.expires_at) < new Date()) {
      setMessage('This invite has expired')
      return
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from('household_members')
      .select('id')
      .eq('user_id', userId)
      .eq('household_id', invite.household_id)
      .single()

    if (existing) {
      setMessage('You are already a member of this household')
      return
    }

    // Join the household
    const { error: joinError } = await supabase
      .from('household_members')
      .insert([{
        user_id: userId,
        household_id: invite.household_id,
        role: 'member'
      }])

    if (joinError) {
      console.error('Error joining household:', joinError)
      setMessage('Failed to join household')
      return
    }

    setMessage(`Joined "${(invite.households as any)?.name}"!`)
    setJoinCode('')
    setShowJoin(false)
    fetchHouseholds()
  }

  function copyInviteCode() {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode)
      setMessage('Copied to clipboard!')
      setTimeout(() => setMessage(null), 2000)
    }
  }

  return (
    <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <label style={{ fontWeight: 'bold' }}>Household:</label>
        <select
          value={selectedHousehold?.id || ''}
          onChange={(e) => {
            const hh = households.find(h => h.id === e.target.value)
            if (hh) {
              onSelect(hh)
              setInviteCode(null)
            }
          }}
          style={{ padding: '8px', fontSize: '14px', borderRadius: '6px', border: '1px solid #ccc' }}
        >
          {households.map((h) => (
            <option key={h.id} value={h.id}>{h.name}</option>
          ))}
        </select>
        <button
          onClick={() => { setShowCreate(!showCreate); setShowJoin(false); setInviteCode(null) }}
          style={{ padding: '8px 12px', fontSize: '14px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
        >
          + New
        </button>
        <button
          onClick={() => { setShowJoin(!showJoin); setShowCreate(false); setInviteCode(null) }}
          style={{ padding: '8px 12px', fontSize: '14px', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
        >
          Join
        </button>
        {selectedHousehold && (
          <button
            onClick={generateInvite}
            style={{ padding: '8px 12px', fontSize: '14px', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            Invite
          </button>
        )}
      </div>

      {showCreate && (
        <form onSubmit={createHousehold} style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Household name..."
            style={{ flex: 1, padding: '8px', fontSize: '14px', borderRadius: '6px', border: '1px solid #ccc' }}
          />
          <button type="submit" style={{ padding: '8px 12px', backgroundColor: '#22c55e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
            Create
          </button>
        </form>
      )}

      {showJoin && (
        <form onSubmit={joinHousehold} style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="Enter invite code..."
            style={{ flex: 1, padding: '8px', fontSize: '14px', borderRadius: '6px', border: '1px solid #ccc', textTransform: 'uppercase' }}
          />
          <button type="submit" style={{ padding: '8px 12px', backgroundColor: '#22c55e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
            Join
          </button>
        </form>
      )}

      {inviteCode && (
        <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#fef3c7', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>Invite code: <strong style={{ fontFamily: 'monospace', fontSize: '18px' }}>{inviteCode}</strong></span>
          <button
            onClick={copyInviteCode}
            style={{ padding: '5px 10px', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Copy
          </button>
          <span style={{ color: '#666', fontSize: '12px' }}>Expires in 7 days</span>
        </div>
      )}

      {message && (
        <p style={{ marginTop: '10px', padding: '8px', backgroundColor: '#e0f2fe', borderRadius: '4px', color: '#0369a1' }}>
          {message}
        </p>
      )}

      {households.length === 0 && (
        <p style={{ marginTop: '10px', color: '#666' }}>Create your first household or join one with an invite code!</p>
      )}
    </div>
  )
}