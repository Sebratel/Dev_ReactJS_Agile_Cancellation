import { type ReactNode } from 'react';
import { LoginForm } from '@/features/auth/components/login-form';

// Sombras neumorphicas — Design System Sebratel (LOGIN_SCREEN_SPEC)
const NEU_INSET_BADGE =
  'inset 3px 3px 7px rgba(0,0,0,0.12), inset -2px -2px 6px rgba(255,255,255,0.85)';
const NEU_ELEVATED =
  '6px 6px 14px rgba(0,0,0,0.11), -4px -4px 10px rgba(255,255,255,0.90)';
const NEU_INSET_ICON =
  'inset 2px 2px 5px rgba(0,0,0,0.12), inset -2px -2px 5px rgba(255,255,255,0.82)';

const IconBolt = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);
const IconCloud = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
  </svg>
);
const IconUsers = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
  </svg>
);
const IconBattery = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M23 11v2h-1V7a2 2 0 0 0-2-2H1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h19a2 2 0 0 0 2-2v-4h1zm-3 7H1V7h19v11z" />
  </svg>
);
const IconWifi = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4 2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z" />
  </svg>
);
const IconBarChart = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z" />
  </svg>
);
const IconLock = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
  </svg>
);

function HexIcon({ children }: { children: ReactNode }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none relative select-none"
      style={{ filter: 'drop-shadow(0 0 8px rgba(255,176,0,0.35))' }}
    >
      <svg width="64" height="72" viewBox="0 0 64 72">
        <polygon
          points="32,2 62,18 62,54 32,70 2,54 2,18"
          fill="rgba(255,176,0,0.10)"
          stroke="rgba(255,176,0,0.80)"
          strokeWidth="1.8"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-primary">
        {children}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex h-screen w-screen overflow-hidden antialiased">
      {/* Painel esquerdo — imagem, overlays, texto e hexagonos (>= lg) */}
      <div className="relative hidden basis-[65%] flex-col justify-end overflow-hidden bg-login-dark lg:flex">
        <img
          src="/login-cover.png"
          alt=""
          aria-hidden="true"
          draggable={false}
          className="login-ken-burns absolute inset-0 h-full w-full object-cover object-center opacity-95"
          onError={(event) => {
            event.currentTarget.style.display = 'none';
          }}
        />

        {/* Overlay 1 — tinte ambar diagonal */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom right, rgba(45,24,0,0.60), transparent, rgba(13,10,6,0.40))',
          }}
        />
        {/* Overlay 2 — fade escuro inferior */}
        <div
          aria-hidden="true"
          className="absolute bottom-0 left-0 right-0 h-52"
          style={{
            background:
              'linear-gradient(to top, rgba(0,0,0,0.70), rgba(0,0,0,0.30), transparent)',
          }}
        />

        <div className="relative z-10 flex items-end justify-between gap-8 px-11 pb-11">
          <div className="min-w-0">
            <div className="mb-5 flex items-center gap-2">
              <img
                src="/logo-circular-sebratel.png"
                alt="Sebratel"
                draggable={false}
                className="h-10 w-10 object-contain opacity-90"
                onError={(event) => {
                  event.currentTarget.style.display = 'none';
                }}
              />
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">
                SEBRATEL - Gestão de Cobrança
              </span>
            </div>

            <h1 className="m-0 max-w-[460px] text-[2.35rem] font-black leading-[1.15] tracking-tight text-white">
              A conexão que
              <br />
              move <span className="text-primary">o que importa.</span>
            </h1>

            <p className="mt-3 max-w-sm text-sm font-medium leading-relaxed text-white/50">
              Tecnologia e pessoas conectadas para levar o melhor todos os dias.
            </p>
          </div>

          <div className="flex shrink-0 flex-col gap-1.5 pb-1">
            <div className="flex gap-1.5">
              <HexIcon>
                <IconBolt />
              </HexIcon>
              <HexIcon>
                <IconCloud />
              </HexIcon>
              <HexIcon>
                <IconUsers />
              </HexIcon>
            </div>
            <div className="flex gap-1.5">
              <HexIcon>
                <IconBattery />
              </HexIcon>
              <HexIcon>
                <IconWifi />
              </HexIcon>
              <HexIcon>
                <IconBarChart />
              </HexIcon>
            </div>
          </div>
        </div>
      </div>

      {/* Divisor ambar — 6px, sempre no tom primary */}
      <div
        aria-hidden="true"
        className="z-10 hidden w-1.5 shrink-0 bg-primary lg:block"
      />

      {/* Painel direito — superficie neumorphic clara */}
      <div className="flex w-full shrink-0 flex-col overflow-y-auto bg-login-surface lg:basis-[35%]">
        <div className="flex flex-1 flex-col items-center justify-center px-8 py-12">
          <div className="flex w-full max-w-[320px] flex-col items-center gap-6">
            {/* Badge — pill neumorphic inset */}
            <div className="flex w-full justify-center">
              <span
                className="inline-flex items-center rounded-full bg-login-surface px-5 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-primary"
                style={{ boxShadow: NEU_INSET_BADGE }}
              >
                Gestão de Cobrança
              </span>
            </div>

            {/* Heading */}
            <div className="w-full text-center">
              <h1 className="m-0 mb-2 text-[1.8rem] font-black leading-tight tracking-tight text-login-ink">
                Acessar plataforma
              </h1>
              <p className="m-0 text-sm leading-snug text-login-muted">
                Entre com sua conta Google corporativa para
                <br />
                controle de permissões por módulo.
              </p>
            </div>

            {/* Card de dominio — neumorphic elevado */}
            <div
              className="flex w-full items-center gap-4 rounded-lg bg-login-surface px-5 py-4"
              style={{ boxShadow: NEU_ELEVATED }}
            >
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-login-surface text-primary"
                style={{ boxShadow: NEU_INSET_ICON }}
              >
                <IconLock />
              </div>
              <div>
                <p className="m-0 mb-[3px] text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
                  Domínio liberado:
                </p>
                <p className="m-0 text-sm font-bold text-login-ink">
                  @sebratel.com.br
                </p>
              </div>
            </div>

            <LoginForm />

            <div className="flex w-full items-center gap-3">
              <span className="h-px flex-1 bg-border" aria-hidden="true" />
              <span className="text-[11px] font-bold lowercase text-login-faint">
                ou
              </span>
              <span className="h-px flex-1 bg-border" aria-hidden="true" />
            </div>

            <a
              href="mailto:suporte@sebratel.com.br"
              className="text-sm font-bold text-primary transition-colors hover:text-primary/80"
            >
              Problemas para acessar?
            </a>
          </div>
        </div>

        {/* Rodape — fora do wrapper de centralizacao */}
        <p className="m-0 select-none pb-5 text-center text-[10px] uppercase tracking-widest text-login-faint">
          © {new Date().getFullYear()} Sebratel · Uso interno
        </p>
      </div>
    </div>
  );
}
