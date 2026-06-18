import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import exceljs from 'exceljs';

const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());

// API: Получить все группы
app.get('/api/groups', async (req, res) => {
  try {
    const groups = await prisma.group.findMany();
    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Получить студентов группы
app.get('/api/groups/:groupId/students', async (req, res) => {
  try {
    const students = await prisma.student.findMany({
      where: { groupId: parseInt(req.params.groupId) }
    });
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Получить посещаемость группы на конкретную дату
app.get('/api/attendance', async (req, res) => {
  try {
    const { groupId, date } = req.query;
    const records = await prisma.attendanceRecord.findMany({
      where: {
        date: new Date(date),
        student: {
          groupId: parseInt(groupId)
        }
      }
    });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Сохранить посещаемость
app.post('/api/attendance', async (req, res) => {
  const { date, records } = req.body;
  // records: [{studentId: 1, status: 'PRESENT'}, ...]
  try {
    const attendanceDate = new Date(date);
    
    // Удаляем старые записи на эту дату для этих студентов, если они есть
    const studentIds = records.map(r => r.studentId);
    await prisma.attendanceRecord.deleteMany({
      where: {
        date: attendanceDate,
        studentId: { in: studentIds }
      }
    });

    const results = await prisma.attendanceRecord.createMany({
      data: records.map(record => ({
        studentId: record.studentId,
        date: attendanceDate,
        status: record.status
      }))
    });
    res.json({ success: true, count: results.count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Генерация Excel отчета за месяц
app.get('/api/reports/excel', async (req, res) => {
  try {
    const { month, year, groupId } = req.query; // '1' - '12', '2024', groupId
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const students = await prisma.student.findMany({
      where: { groupId: parseInt(groupId) },
      include: {
        attendance: {
          where: {
            date: { gte: startDate, lte: endDate }
          }
        }
      }
    });

    const group = await prisma.group.findUnique({ where: { id: parseInt(groupId) } });

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Посещаемость');

    worksheet.columns = [
      { header: 'Студент', key: 'name', width: 30 },
      { header: 'Присутствовал', key: 'present', width: 15 },
      { header: 'Отсутствовал', key: 'absent', width: 15 },
      { header: 'Уважительная', key: 'excused', width: 15 },
      { header: 'Опоздание', key: 'late', width: 15 },
      { header: '% Посещаемости', key: 'percentage', width: 20 },
    ];

    students.forEach(student => {
      let present = 0, absent = 0, excused = 0, late = 0;
      student.attendance.forEach(record => {
        if (record.status === 'PRESENT') present++;
        if (record.status === 'ABSENT') absent++;
        if (record.status === 'EXCUSED') excused++;
        if (record.status === 'LATE') late++;
      });
      
      const total = present + absent + excused + late;
      const percentage = total > 0 ? ((present + late + excused) / total * 100).toFixed(2) + '%' : '0%';

      worksheet.addRow({
        name: student.name,
        present, absent, excused, late, percentage
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=attendance_${group?.name}_${month}_${year}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
