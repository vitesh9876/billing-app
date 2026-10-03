-- EMPTY TEST PROJECT ONLY. Never use this to initialize the live database.
CREATE TABLE public.customers (
  id varchar PRIMARY KEY, name varchar NOT NULL, phone varchar NOT NULL,
  address varchar NOT NULL, father varchar, idproof varchar, mandal varchar
);
CREATE TABLE public.transactions (
  id varchar PRIMARY KEY, "customerId" varchar NOT NULL, type varchar NOT NULL,
  amount integer NOT NULL, category varchar, date varchar NOT NULL,
  "itemsJson" text NOT NULL, status varchar, "clearedDate" varchar
);
CREATE TABLE public.sms_queue (
  uuid varchar PRIMARY KEY, "customerId" varchar, phone varchar NOT NULL,
  message text NOT NULL, "templateId" varchar, priority integer, status varchar,
  "retryCount" integer, "bridgeDeviceId" varchar, "createdAt" varchar,
  "scheduledAt" varchar, "sentAt" varchar, "completedAt" varchar, "errorMessage" text
);
CREATE TABLE public.devices (
  "deviceUuid" varchar PRIMARY KEY, name varchar, model varchar, battery integer,
  operator varchar, "androidVersion" varchar, "appVersion" varchar, "lastIp" varchar,
  "connectionType" varchar, "lastSeen" varchar, "isPrimaryHost" boolean,
  "isOnline" boolean, "connectionStatus" varchar
);
CREATE TABLE public.sms_templates (
  id serial PRIMARY KEY, name varchar UNIQUE NOT NULL, content text NOT NULL
);
CREATE TABLE public.item_catalog (
  id serial PRIMARY KEY, name varchar NOT NULL, category varchar NOT NULL
);
