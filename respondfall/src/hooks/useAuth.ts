import { useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase, AgencyOwner } from '../lib/supabase'

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [agencyOwner, setAgencyOwner] = useState<AgencyOwner | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchAgencyOwner(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchAgencyOwner(session.user.id)
      else {
        setAgencyOwner(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchAgencyOwner(userId: string) {
    const { data } = await supabase
      .from('agency_owners')
      .select('*')
      .eq('user_id', userId)
      .single()
    setAgencyOwner(data)
    setLoading(false)
  }

  async function signIn(email: string, password: string) {
    return supabase.auth.signInWithPassword({ email, password })
  }

  async function signUp(email: string, password: string) {
    return supabase.auth.signUp({ email, password })
  }

  async function signInWithMagicLink(email: string) {
    return supabase.auth.signInWithOtp({ email })
  }

  async function signOut() {
    return supabase.auth.signOut()
  }

  return { session, user, agencyOwner, loading, signIn, signUp, signInWithMagicLink, signOut }
}
