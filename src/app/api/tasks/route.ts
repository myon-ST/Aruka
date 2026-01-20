import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// タスク一覧取得
export async function GET() {
  try {
    const tasks = await prisma.task.findMany({
      include: {
        project: {
          include: {
            workTasks: true,
            bookFields: true,
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

// タスク作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const task = await prisma.task.create({
      data: {
        type: body.type,
        title: body.title,
        description: body.description,
        date: new Date(body.date),
        startTime: body.startTime,
        endTime: body.endTime,
        color: body.color,
        projectId: body.projectId || null,
        status: body.status || 'will-do',
        lecturePeriod: body.lecturePeriod,
      },
      include: {
        project: {
          include: {
            workTasks: true,
            bookFields: true,
          },
        },
      },
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
