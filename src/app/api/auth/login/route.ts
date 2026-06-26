import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { pbkdf2Sync, randomBytes } from 'crypto'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const [salt, storedHash] = user.password.split(':')
    const hash = pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')

    if (hash !== storedHash) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const token = randomBytes(32).toString('hex')
    await prisma.user.update({ where: { id: user.id }, data: { token } })

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
      token,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
