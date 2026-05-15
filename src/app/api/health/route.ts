import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  // Solo accesible desde Vercel Cron o con la clave interna
  const authHeader = request.headers.get('authorization')
  const healthSecret = process.env.HEALTH_SECRET ?? process.env.CRON_SECRET
  if (healthSecret && authHeader !== `Bearer ${healthSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()

  try {
    // Verificar conexión a Supabase
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)
      .single()

    if (error) {
      logger.error('Health check failed - Database connection error', { error: error.message })
      return NextResponse.json(
        {
          status: 'error',
          message: 'Database connection failed',
          timestamp: new Date().toISOString(),
          responseTime: `${Date.now() - startTime}ms`,
        },
        { status: 500 }
      )
    }

    // Verificar variables de entorno críticas
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    ]

    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar])

    if (missingEnvVars.length > 0) {
      logger.warn('Health check warning - Missing environment variables', {
        missingVars: missingEnvVars
      })
    }

    logger.info('Health check passed', {
      responseTime: `${Date.now() - startTime}ms`,
      databaseStatus: 'ok',
      missingEnvVars: missingEnvVars.length,
    })

    return NextResponse.json({
      status: 'ok',
      message: 'Service is healthy',
      timestamp: new Date().toISOString(),
      responseTime: `${Date.now() - startTime}ms`,
      checks: {
        database: 'ok',
        environment: missingEnvVars.length === 0 ? 'ok' : 'warning',
      },
      version: process.env.npm_package_version || 'unknown',
    })

  } catch (error) {
    logger.error('Health check failed - Unexpected error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: `${Date.now() - startTime}ms`,
    })

    return NextResponse.json(
      {
        status: 'error',
        message: 'Unexpected error during health check',
        timestamp: new Date().toISOString(),
        responseTime: `${Date.now() - startTime}ms`,
      },
      { status: 500 }
    )
  }
}