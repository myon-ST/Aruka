import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// プロジェクト更新
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { id } = params;

    // 既存のプロジェクトを取得
    const existingProject = await prisma.project.findUnique({
      where: { id },
      include: { workTasks: true, bookFields: true },
    });

    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // 関連データを削除
    await prisma.workTask.deleteMany({ where: { projectId: id } });
    await prisma.bookField.deleteMany({ where: { projectId: id } });

    // 進捗計算
    let progress = body.progress || 0;
    if (body.type === 'work' && body.tasks?.length > 0) {
      const completedCount = body.tasks.filter((t: any) => t.completed).length;
      progress = (completedCount / body.tasks.length) * 100;
    } else if (body.type === 'book' && body.totalPages > 0) {
      progress = (body.currentPage / body.totalPages) * 100;
    } else if (body.type === 'lecture' && body.totalSessions > 0) {
      progress = (body.completedSessions / body.totalSessions) * 100;
    }

    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        name: body.name,
        type: body.type,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        description: body.description,
        progress,
        subject: body.subject,
        totalPages: body.totalPages,
        currentPage: body.currentPage,
        totalSessions: body.totalSessions,
        completedSessions: body.completedSessions,
        workTasks: body.tasks ? {
          create: body.tasks.map((task: any) => ({
            name: task.name,
            completed: task.completed,
          })),
        } : undefined,
        bookFields: body.fields ? {
          create: body.fields.map((field: any) => ({
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

    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}

// プロジェクト削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    await prisma.project.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}
