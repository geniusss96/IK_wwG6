import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, Download, Users, Calendar, CheckCircle2, Printer } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function App() {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [toast, setToast] = useState(null);

  // Сбор данных о группах (пока можно захардкодить для демо, если БД пуста)
  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const res = await axios.get(`${API_URL}/groups`);
      if (res.data.length > 0) {
        setGroups(res.data);
        setSelectedGroup(res.data[0].id);
      } else {
        // Демо данные если БД пуста
        setGroups([{ id: 1, name: 'ИС-21' }, { id: 2, name: 'ПИ-22' }]);
        setSelectedGroup(1);
      }
    } catch (e) {
      console.error(e);
      setGroups([{ id: 1, name: 'ИС-21 (Демо)' }]);
      setSelectedGroup(1);
    }
  };

  useEffect(() => {
    if (selectedGroup) {
      fetchStudents();
    }
  }, [selectedGroup, date]);

  const fetchStudents = async () => {
    try {
      const res = await axios.get(`${API_URL}/groups/${selectedGroup}/students`);
      if (res.data.length > 0) {
        setStudents(res.data);
      } else {
        // Демо данные
        setStudents([
          { id: 1, name: 'Иванов Иван' },
          { id: 2, name: 'Петров Петр' },
          { id: 3, name: 'Сидорова Анна' }
        ]);
      }
      
      // Попытка загрузить существующую посещаемость
      try {
        const attRes = await axios.get(`${API_URL}/attendance?groupId=${selectedGroup}&date=${date}`);
        const attMap = {};
        attRes.data.forEach(r => {
          attMap[r.studentId] = r.status;
        });
        setAttendance(attMap);
      } catch (e) {}
    } catch (e) {
      console.error(e);
    }
  };

  const handleStatusChange = (studentId, status) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSave = async () => {
    const records = Object.keys(attendance).map(studentId => ({
      studentId: parseInt(studentId),
      status: attendance[studentId]
    }));

    try {
      await axios.post(`${API_URL}/attendance`, { date, records });
      showToast('Посещаемость успешно сохранена!');
    } catch (e) {
      showToast('Ошибка при сохранении посещаемости');
      console.error(e);
    }
  };

  const handleExportExcel = () => {
    const month = new Date(date).getMonth() + 1;
    const year = new Date(date).getFullYear();
    window.open(`${API_URL}/reports/excel?groupId=${selectedGroup}&month=${month}&year=${year}`, '_blank');
  };

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const selectedGroupName = groups.find(g => g.id == selectedGroup)?.name || '';

  return (
    <div className="container">
      <div className="glass-panel">
        <div className="header">
          <h1>Журнал посещаемости</h1>
          <div className="controls">
            <button className="btn btn-secondary" onClick={() => window.print()}>
              <Printer size={18} />
              Печать PDF
            </button>
            <button className="btn btn-secondary" onClick={handleExportExcel}>
              <Download size={18} />
              Экспорт Excel
            </button>
            <button className="btn" onClick={handleSave}>
              <Save size={18} />
              Сохранить
            </button>
          </div>
        </div>

        <div className="controls">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={18} color="var(--text-muted)" />
            <select 
              className="glass-select"
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
            >
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={18} color="var(--text-muted)" />
            <input 
              type="date" 
              className="glass-input" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>
        
        <div className="print-only">
          <p>Группа: <strong>{selectedGroupName}</strong></p>
          <p>Дата: <strong>{new Date(date).toLocaleDateString('ru-RU')}</strong></p>
        </div>

        <table className="attendance-table">
          <thead>
            <tr>
              <th>Студент</th>
              <th>Отметка о присутствии</th>
            </tr>
          </thead>
          <tbody>
            {students.map(student => (
              <tr key={student.id}>
                <td className="student-name">{student.name}</td>
                <td>
                  <div className="status-buttons">
                    <button 
                      className={`status-btn ${attendance[student.id] === 'PRESENT' ? 'active PRESENT' : ''}`}
                      onClick={() => handleStatusChange(student.id, 'PRESENT')}
                    >
                      Присутствует
                    </button>
                    <button 
                      className={`status-btn ${attendance[student.id] === 'ABSENT' ? 'active ABSENT' : ''}`}
                      onClick={() => handleStatusChange(student.id, 'ABSENT')}
                    >
                      Отсутствует
                    </button>
                    <button 
                      className={`status-btn ${attendance[student.id] === 'EXCUSED' ? 'active EXCUSED' : ''}`}
                      onClick={() => handleStatusChange(student.id, 'EXCUSED')}
                    >
                      Уважительная
                    </button>
                    <button 
                      className={`status-btn ${attendance[student.id] === 'LATE' ? 'active LATE' : ''}`}
                      onClick={() => handleStatusChange(student.id, 'LATE')}
                    >
                      Опоздание
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr>
                <td colSpan="2" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  Нет студентов в выбранной группе
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {toast && (
        <div className="toast-container">
          <div className="toast">
            <CheckCircle2 size={18} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} />
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
