import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AppBar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  Toolbar,
  Typography
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { api } from './api';
import type { Machine, Slot, WeekSchedule } from './types';

function slotColor(status: Slot['status']) {
  if (status === 'mine') return 'success';
  if (status === 'occupied') return 'inherit';
  if (status === 'disabled') return 'inherit';
  return 'primary';
}

function addDaysIso(date: string, days: number) {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

export default function App() {
  const [schedule, setSchedule] = useState<WeekSchedule | null>(null);
  const [selectedMachine, setSelectedMachine] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState('');
  const [pendingSlot, setPendingSlot] = useState<Slot | null>(null);

  const activeMachine = useMemo<Machine | undefined>(
    () => schedule?.machines.find((machine) => machine.id === selectedMachine),
    [schedule, selectedMachine]
  );

  async function load(weekStart?: string) {
    setLoading(true);
    setError('');
    try {
      const next = await api.getWeekSchedule(weekStart);
      setSchedule(next);
      setSelectedMachine((current) => current || next.machines[0]?.id || '');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function reserve(slot: Slot) {
    setPendingSlot(null);
    setLoading(true);
    try {
      const next = await api.reserveSlot({
        date: slot.date,
        startTime: slot.startTime,
        machineId: slot.machineId
      });
      setSchedule(next);
      setSnackbar('Запись создана');
    } catch (reserveError) {
      setError(reserveError instanceof Error ? reserveError.message : String(reserveError));
      await load(schedule?.weekStart);
    } finally {
      setLoading(false);
    }
  }

  async function cancel(slot: Slot) {
    if (!slot.reservationId) return;
    setLoading(true);
    try {
      const next = await api.cancelReservation(slot.reservationId);
      setSchedule(next);
      setSnackbar('Запись отменена');
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : String(cancelError));
    } finally {
      setLoading(false);
    }
  }

  const visibleSlots = useMemo(() => {
    if (!schedule || !selectedMachine) return [];
    return schedule.slots.filter((slot) => slot.machineId === selectedMachine);
  }, [schedule, selectedMachine]);

  const slotsByTime = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const slot of visibleSlots) {
      const key = `${slot.startTime}-${slot.endTime}`;
      map.set(key, [...(map.get(key) ?? []), slot]);
    }
    return Array.from(map.entries());
  }, [visibleSlots]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f6f7f9' }}>
      <AppBar position="sticky" color="default" elevation={1}>
        <Toolbar sx={{ gap: 2, flexWrap: 'wrap' }}>
          <EventAvailableIcon color="primary" />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Запись в прачечную
          </Typography>
          {schedule?.environment === 'staging' || schedule?.environment === 'local' ? (
            <Chip label={schedule.environment.toUpperCase()} color="warning" size="small" />
          ) : null}
          <Button startIcon={<RefreshIcon />} onClick={() => load(schedule?.weekStart)} disabled={loading}>
            Обновить
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 3 }}>
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        ) : null}

        {loading && !schedule ? (
          <Stack alignItems="center" sx={{ py: 8 }}>
            <CircularProgress />
          </Stack>
        ) : null}

        {schedule ? (
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
              <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                {schedule.currentUser.email} · неделя с {schedule.weekStart}
              </Typography>
              <Button onClick={() => load(addDaysIso(schedule.weekStart, -7))}>Предыдущая</Button>
              <Button onClick={() => load(addDaysIso(schedule.weekStart, 7))}>Следующая</Button>
            </Stack>

            <Tabs
              value={selectedMachine}
              onChange={(_, value: string) => setSelectedMachine(value)}
              variant="scrollable"
              scrollButtons="auto"
            >
              {schedule.machines.map((machine) => (
                <Tab key={machine.id} value={machine.id} label={machine.name} />
              ))}
            </Tabs>

            <Typography variant="h6">{activeMachine?.name}</Typography>

            <Box sx={{ overflowX: 'auto', pb: 1 }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: `110px repeat(${schedule.days.length}, minmax(128px, 1fr))`,
                  gap: 1,
                  minWidth: 980
                }}
              >
                <Box />
                {schedule.days.map((day) => (
                  <Box key={day.date} sx={{ fontWeight: 700, fontSize: 14 }}>
                    {day.label}
                  </Box>
                ))}

                {slotsByTime.map(([time, slots]) => (
                  <Box key={time} sx={{ display: 'contents' }}>
                    <Box sx={{ fontSize: 13, color: 'text.secondary', py: 1 }}>{time}</Box>
                    {slots.map((slot) => (
                      <Button
                        key={slot.id}
                        variant={slot.status === 'free' ? 'outlined' : 'contained'}
                        color={slotColor(slot.status)}
                        disabled={loading || slot.status === 'occupied' || slot.status === 'disabled'}
                        onClick={() => (slot.status === 'mine' ? cancel(slot) : setPendingSlot(slot))}
                        endIcon={slot.status === 'mine' ? <DeleteOutlineIcon /> : undefined}
                        sx={{
                          minHeight: 44,
                          textTransform: 'none',
                          justifyContent: 'center',
                          whiteSpace: 'normal',
                          lineHeight: 1.2
                        }}
                      >
                        {slot.status === 'free' ? 'Свободно' : slot.occupantLabel || 'Занято'}
                      </Button>
                    ))}
                  </Box>
                ))}
              </Box>
            </Box>
          </Stack>
        ) : null}
      </Container>

      <Dialog open={Boolean(pendingSlot)} onClose={() => setPendingSlot(null)}>
        <DialogTitle>Подтвердить запись</DialogTitle>
        <DialogContent>
          {pendingSlot ? (
            <Typography>
              {pendingSlot.date}, {pendingSlot.startTime}-{pendingSlot.endTime}, {activeMachine?.name}
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingSlot(null)}>Отмена</Button>
          <Button variant="contained" onClick={() => pendingSlot && reserve(pendingSlot)}>
            Записаться
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(snackbar)}
        autoHideDuration={3000}
        onClose={() => setSnackbar('')}
        message={snackbar}
      />
    </Box>
  );
}
