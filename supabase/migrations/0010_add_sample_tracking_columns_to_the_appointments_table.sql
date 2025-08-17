ALTER TABLE public.appointments
ADD COLUMN samples_collected BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN samples_dropped_off BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN sample_details TEXT,
ADD COLUMN drop_off_timestamp TIMESTAMP WITH TIME ZONE;