import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// プロジェクト一覧取得
export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      include: {
        workTasks: true,
        bookFields: true,
        tasks: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

// プロジェクト作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      type,
      startDate,
      endDate,
      description,
      // 作業用
      tasks: workTasks,
      // 参考書用
      subject,
      totalPages,
      currentPage,
      fields,
      // 講義用
      totalSessions,
      completedSessions,
    } = body;

    // 進捗計算
    let progress = 0;
    if (type === 'work' && workTasks?.length > 0) {
      const completedCount = workTasks.filter((t: any) => t.completed).length;
      progress = (completedCount / workTasks.length) * 100;
    } else if (type === 'book' && totalPages > 0) {
      progress = (currentPage / totalPages) * 100;
    } else if (type === 'lecture' && totalSessions > 0) {
      progress = (completedSessions / totalSessions) * 100;
    }

    const project = await prisma.project.create({
      data: {
        name,
        type,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        description,
        progress,
        subject,
        totalPages,
        currentPage,
        totalSessions,
        completedSessions,
        workTasks: workTasks ? {
          create: workTasks.map((task: any) => ({
            name: task.name,
            completed: task.completed,
          })),
        } : undefined,
        bookFields: fields ? {
          create: fields.map((field: any) => ({
            name: field.name,
            completed: field.completed,
          })),
        } : undefined,
      },
      include: {
        workTasks: true,
        bookFields: true,
        tasks: true,
      },
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
