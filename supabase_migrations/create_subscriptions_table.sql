-- Tabla de suscripciones para AniVerse
-- Esta tabla registra el estado de las suscripciones de los usuarios a los planes premium

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'inactive',
  plan_level VARCHAR(50) NOT NULL,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('active', 'canceled', 'past_due', 'incomplete', 'incomplete_expired', 'trialing', 'unpaid', 'inactive')),
  CONSTRAINT valid_plan_level CHECK (plan_level IN ('fan_starter', 'pro_otaku')),
  CONSTRAINT unique_user_subscription UNIQUE (user_id)
);

-- Índices para mejorar el rendimiento de las consultas
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscriptions_updated_at();

-- Comentarios para documentación
COMMENT ON TABLE subscriptions IS 'Registra las suscripciones activas y canceladas de los usuarios a los planes premium de AniVerse';
COMMENT ON COLUMN subscriptions.user_id IS 'ID del usuario que tiene la suscripción';
COMMENT ON COLUMN subscriptions.stripe_customer_id IS 'ID del cliente en Stripe';
COMMENT ON COLUMN subscriptions.stripe_subscription_id IS 'ID de la suscripción en Stripe';
COMMENT ON COLUMN subscriptions.status IS 'Estado actual de la suscripción: active, canceled, past_due, etc.';
COMMENT ON COLUMN subscriptions.plan_level IS 'Nivel del plan: fan_starter o pro_otaku';
COMMENT ON COLUMN subscriptions.current_period_start IS 'Inicio del período de facturación actual';
COMMENT ON COLUMN subscriptions.current_period_end IS 'Fin del período de facturación actual';
COMMENT ON COLUMN subscriptions.cancel_at_period_end IS 'Indica si la suscripción se cancelará al final del período actual';

