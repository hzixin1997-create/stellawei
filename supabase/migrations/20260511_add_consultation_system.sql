-- Supabase Schema 更新
-- 支持：统一登录、师傅白名单、订单系统、Stripe支付

-- 用户表扩展（已存在 auth.users，此处为应用层表）
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  role text default 'user' check (role in ('user', 'master', 'admin')),
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 师傅详情表
create table if not exists public.masters (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references public.profiles(id) on delete cascade,
  slug text unique not null,
  name text not null,
  specialties text[] default '{}',
  experience text,
  bio text,
  avatar_url text,
  pricing_tier jsonb default '{}',
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 服务/咨询订单表
create table if not exists public.consultations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  master_id uuid references public.masters(id) not null,
  service_type text not null, -- 'trial', 'basic', 'deep', 'fengshui'
  status text default 'pending' check (status in ('pending', 'paid', 'confirmed', 'completed', 'cancelled')),
  price_usd integer not null, -- 美分
  platform_fee_usd integer not null,
  master_fee_usd integer not null,
  stripe_payment_intent_id text,
  scheduled_at timestamp with time zone,
  completed_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 预约时间段表
create table if not exists public.time_slots (
  id uuid default gen_random_uuid() primary key,
  master_id uuid references public.masters(id) not null,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  is_booked boolean default false,
  consultation_id uuid references public.consultations(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 留言/消息表
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  consultation_id uuid references public.consultations(id) not null,
  sender_id uuid references public.profiles(id) not null,
  content text not null,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 创建索引
create index idx_profiles_email on public.profiles(email);
create index idx_consultations_user on public.consultations(user_id);
create index idx_consultations_master on public.consultations(master_id);
create index idx_time_slots_master on public.time_slots(master_id);
create index idx_messages_consultation on public.messages(consultation_id);

-- 触发器：自动更新 updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create trigger update_profiles_updated_at before update on public.profiles
  for each row execute function update_updated_at_column();

create trigger update_consultations_updated_at before update on public.consultations
  for each row execute function update_updated_at_column();
