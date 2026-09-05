import { z } from 'zod';

export const loginSchema = z.object({
  usernameOrEmail: z.string().min(1),
  password: z.string().min(1),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export const postStatusSchema = z.object({
  status: z.enum(['draft', 'published']),
});

export const postSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).optional(),
  excerpt: z.string().max(500).optional().nullable(),
  content: z.string().default(''),
  categoryId: z.string().optional().nullable(),
  coverImage: z.string().optional().nullable(),
  status: z.enum(['draft', 'published']).default('draft'),
  pinned: z.boolean().default(false),
  commentsEnabled: z.boolean().optional().default(true),
  publishedAt: z.string().datetime().optional().nullable(), // ISO
  tagIds: z.array(z.string()).default([]),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
});

export const tagSchema = z.object({
  name: z.string().min(1).max(50),
  slug: z.string().optional(),
});

export const categorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().optional(),
  description: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  order: z.number().optional().default(0),
});

export const pageSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).optional(),
  content: z.string().default(''),
  status: z.enum(['draft', 'published']).default('published'),
  menuOrder: z.number().optional().default(0),
  showInMenu: z.boolean().optional().default(false),
});

export const linkSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url(),
  description: z.string().optional().nullable(),
  avatar: z.string().optional().nullable(),
  order: z.number().optional().default(0),
  status: z.enum(['active', 'hidden']).default('active'),
});

export const subscriberCreateSchema = z.object({
  email: z.string().email(),
  name: z.string().optional().nullable(),
});

