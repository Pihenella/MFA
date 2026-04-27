import { escapeHtml } from "./auth-utils";

const PRIMARY = "#f97316";
const FOOTER = `
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0 16px;" />
  <p style="color:#6b7280;font-size:12px;">
    Это автоматическое письмо от Finly — финансы селлера на маркетплейсах.<br/>
    Связь с разработчиком: <a href="https://t.me/Virtuozick" style="color:${PRIMARY};">@Virtuozick</a>
  </p>
`;

function wrap(content: string, title: string): string {
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="font-family:Inter,-apple-system,BlinkMacSystemFont,sans-serif;background:#fafafa;margin:0;padding:24px;color:#0a0a0a;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #e5e7eb;">
    <h1 style="font-size:18px;font-weight:600;color:${PRIMARY};margin:0 0 16px;">Finly</h1>
    ${content}
    ${FOOTER}
  </div>
</body>
</html>`;
}

function btn(href: string, label: string): string {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;background:${PRIMARY};color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:500;margin:16px 0;">${escapeHtml(label)}</a>`;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export function renderVerifyEmail(args: {
  name: string;
  verifyUrl: string;
}): RenderedEmail {
  const subject = "Подтверждение email — Finly";
  const safeName = escapeHtml(args.name);
  const html = wrap(
    `<p>Здравствуйте, ${safeName}!</p>
     <p>Подтвердите ваш email, чтобы продолжить регистрацию в Finly. Ссылка действительна 24 часа.</p>
     ${btn(args.verifyUrl, "Подтвердить email")}
     <p style="font-size:12px;color:#6b7280;">Если кнопка не работает: ${escapeHtml(args.verifyUrl)}</p>`,
    subject
  );
  const text = `Здравствуйте, ${args.name}!\nПодтвердите ваш email — ссылка действительна 24 часа:\n${args.verifyUrl}`;
  return { subject, html, text };
}

export function renderApprovedEmail(args: {
  name: string;
  loginUrl: string;
}): RenderedEmail {
  const subject = "Заявка одобрена — Finly";
  const html = wrap(
    `<p>Здравствуйте, ${escapeHtml(args.name)}!</p>
     <p>Ваш аккаунт в Finly одобрен. Можете войти и подключить магазины Wildberries и Ozon.</p>
     ${btn(args.loginUrl, "Войти в Finly")}`,
    subject
  );
  const text = `Здравствуйте, ${args.name}!\nВаш аккаунт в Finly одобрен.\nВойти: ${args.loginUrl}`;
  return { subject, html, text };
}

export function renderRejectedEmail(args: {
  name: string;
  reason?: string;
  supportContact: string;
}): RenderedEmail {
  const subject = "Заявка не одобрена — Finly";
  const reasonBlock = args.reason
    ? `<p><strong>Причина:</strong> ${escapeHtml(args.reason)}</p>`
    : "";
  const html = wrap(
    `<p>Здравствуйте, ${escapeHtml(args.name)}.</p>
     <p>К сожалению, ваша заявка на регистрацию в Finly не была одобрена.</p>
     ${reasonBlock}
     <p>Если у вас есть вопросы — напишите ${escapeHtml(args.supportContact)}.</p>`,
    subject
  );
  const text = `Здравствуйте, ${args.name}.\nК сожалению, ваша заявка не одобрена.${args.reason ? `\nПричина: ${args.reason}` : ""}\nВопросы: ${args.supportContact}`;
  return { subject, html, text };
}

export function renderResetPasswordEmail(args: {
  name: string;
  resetUrl: string;
}): RenderedEmail {
  const subject = "Сброс пароля — Finly";
  const html = wrap(
    `<p>Здравствуйте, ${escapeHtml(args.name)}!</p>
     <p>Кто-то запросил сброс пароля для вашего аккаунта. Если это были не вы — проигнорируйте письмо.</p>
     <p>Ссылка действительна 1 час.</p>
     ${btn(args.resetUrl, "Сбросить пароль")}
     <p style="font-size:12px;color:#6b7280;">${escapeHtml(args.resetUrl)}</p>`,
    subject
  );
  const text = `Здравствуйте, ${args.name}!\nСброс пароля (1 час): ${args.resetUrl}\nЕсли это были не вы — проигнорируйте.`;
  return { subject, html, text };
}

export function renderTeamInviteEmail(args: {
  inviterName: string;
  orgName: string;
  acceptUrl: string;
}): RenderedEmail {
  const subject = `${args.inviterName} приглашает вас в ${args.orgName} на Finly`;
  const html = wrap(
    `<p>${escapeHtml(args.inviterName)} приглашает вас присоединиться к организации <strong>${escapeHtml(args.orgName)}</strong> на Finly.</p>
     <p>Ссылка действительна 3 дня.</p>
     ${btn(args.acceptUrl, "Принять приглашение")}`,
    subject
  );
  const text = `${args.inviterName} приглашает вас в ${args.orgName} на Finly.\nПринять (3 дня): ${args.acceptUrl}`;
  return { subject, html, text };
}

export function renderInviteAcceptedEmail(args: {
  ownerName: string;
  inviteeName: string;
  orgName: string;
}): RenderedEmail {
  const subject = `${args.inviteeName} присоединился к ${args.orgName}`;
  const html = wrap(
    `<p>Здравствуйте, ${escapeHtml(args.ownerName)}!</p>
     <p>${escapeHtml(args.inviteeName)} присоединился к организации ${escapeHtml(args.orgName)} на Finly.</p>`,
    subject
  );
  const text = `Здравствуйте, ${args.ownerName}!\n${args.inviteeName} присоединился к ${args.orgName}.`;
  return { subject, html, text };
}
