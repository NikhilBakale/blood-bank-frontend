-- Create enum for blood types
CREATE TYPE blood_type AS ENUM ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-');

-- Create enum for request status
CREATE TYPE request_status AS ENUM ('pending', 'approved', 'rejected', 'completed');

-- Create profiles table for hospital details
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  hospital_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create inventory table
CREATE TABLE public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  blood_type blood_type NOT NULL,
  units_available INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(hospital_id, blood_type)
);

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own inventory"
  ON public.inventory FOR SELECT
  USING (auth.uid() = hospital_id);

CREATE POLICY "Users can manage their own inventory"
  ON public.inventory FOR ALL
  USING (auth.uid() = hospital_id);

-- Create donors table
CREATE TABLE public.donors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  blood_type blood_type NOT NULL,
  phone TEXT,
  email TEXT,
  last_donation_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.donors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own donors"
  ON public.donors FOR ALL
  USING (auth.uid() = hospital_id);

-- Create transfers table
CREATE TABLE public.transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_hospital_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  to_hospital_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  blood_type blood_type NOT NULL,
  units INTEGER NOT NULL,
  transfer_date TIMESTAMPTZ DEFAULT NOW(),
  status request_status DEFAULT 'pending',
  notes TEXT
);

ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transfers"
  ON public.transfers FOR SELECT
  USING (auth.uid() = from_hospital_id OR auth.uid() = to_hospital_id);

CREATE POLICY "Users can create transfers"
  ON public.transfers FOR INSERT
  WITH CHECK (auth.uid() = from_hospital_id);

CREATE POLICY "Users can update their own transfers"
  ON public.transfers FOR UPDATE
  USING (auth.uid() = from_hospital_id OR auth.uid() = to_hospital_id);

-- Create blood requests table
CREATE TABLE public.blood_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  blood_type blood_type NOT NULL,
  units_needed INTEGER NOT NULL,
  urgency TEXT NOT NULL,
  status request_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

ALTER TABLE public.blood_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all requests"
  ON public.blood_requests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage their own requests"
  ON public.blood_requests FOR ALL
  USING (auth.uid() = hospital_id);

-- Create trigger function for profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, hospital_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'hospital_name', 'Hospital'),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create trigger for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();