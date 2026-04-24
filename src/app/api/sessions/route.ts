import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const DATA_PATH = path.join(process.cwd(), "data", "sessions.json");

export interface Session {
  id: string;
  date: string;
  durationMinutes: number;
  completedAt: string;
  label?: string;
}

async function readSessions(): Promise<Session[]> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf-8");
    return JSON.parse(raw) as Session[];
  } catch {
    return [];
  }
}

async function writeSessions(sessions: Session[]) {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(sessions, null, 2));
}

export async function GET() {
  const sessions = await readSessions();
  return NextResponse.json(sessions);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const session: Session = {
    id: crypto.randomUUID(),
    date: body.date ?? new Date().toISOString().split("T")[0],
    durationMinutes: body.durationMinutes ?? 30,
    completedAt: body.completedAt ?? new Date().toISOString(),
    label: body.label ?? "Focus Session",
  };

  const sessions = await readSessions();
  sessions.push(session);
  await writeSessions(sessions);

  return NextResponse.json(session, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, label } = body;
  if (!id || typeof label !== "string") {
    return NextResponse.json({ error: "Missing id or label" }, { status: 400 });
  }

  const sessions = await readSessions();
  const index = sessions.findIndex((s) => s.id === id);
  if (index === -1) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  sessions[index].label = label;
  await writeSessions(sessions);
  return NextResponse.json(sessions[index]);
}
