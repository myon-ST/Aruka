import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// タスク更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { id } = await params;

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        type: body.type,
        title: body.title,
        description: body.description,
        date: new Date(body.date),
        startTime: body.startTime,
        endTime: body.endTime,
        color: body.color,
        projectId: body.projectId || null,
        status: body.status,
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

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

// タスク削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.task.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
