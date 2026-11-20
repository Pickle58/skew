import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ArticlePage } from "@/components/article/article-page";
import {
  getArticleDetail,
  getArticleEmbedding,
  getArticleMetadata,
  getRelatedArticles,
} from "@/lib/supabase/queries/articles";

type NewsPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: NewsPageProps): Promise<Metadata> {
  "use cache";
  const { id } = await params;
  const article = await getArticleMetadata(id);
  if (!article) {
    return { title: "Story not found" };
  }
  return { title: article.title };
}

export default async function NewsPage({ params }: NewsPageProps) {
  await connection();
  await auth.protect();
  const { id } = await params;
  const article = await getArticleDetail(id);
  if (!article) {
    notFound();
  }
  const embedding = await getArticleEmbedding(article.id);
  const related = embedding ? await getRelatedArticles(article.id, embedding) : [];
  return <ArticlePage article={article} related={related} />;
}
