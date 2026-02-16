/**
 * Progress Tracker
 * 进度追踪器 - 生成追踪 SQL
 */

export function sqlCreateJobStep(
  jobId: string,
  stepType: string,
  targetId: string,
  chapterNumber: number
): string {
  return `
    INSERT INTO novel_kb.job_steps (job_id, step_type, target_id, chapter_number, status, started_at)
    VALUES ('${jobId}', '${stepType}', '${targetId}', ${chapterNumber}, 'running', NOW())
    RETURNING id
  `.trim();
}

export function sqlCompleteJobStep(
  stepId: string,
  tokensInput: number,
  tokensOutput: number
): string {
  return `
    UPDATE novel_kb.job_steps
    SET status = 'completed', tokens_input = ${tokensInput}, tokens_output = ${tokensOutput}, completed_at = NOW()
    WHERE id = '${stepId}'
  `.trim();
}

export function sqlFailJobStep(stepId: string, errorMessage: string): string {
  const escapedMsg = errorMessage.replace(/'/g, "''");
  return `
    UPDATE novel_kb.job_steps
    SET status = 'failed', error_message = '${escapedMsg}', retry_count = retry_count + 1
    WHERE id = '${stepId}'
  `.trim();
}

export function sqlUpdateJobProgress(
  jobId: string,
  completedSteps: number,
  failedSteps: number,
  tokensInput: number,
  tokensOutput: number
): string {
  return `
    UPDATE novel_kb.jobs
    SET completed_steps = ${completedSteps}, failed_steps = ${failedSteps},
        tokens_input = ${tokensInput}, tokens_output = ${tokensOutput}
    WHERE id = '${jobId}'
  `.trim();
}

export function sqlCompleteJob(jobId: string): string {
  return `
    UPDATE novel_kb.jobs SET status = 'completed', completed_at = NOW() WHERE id = '${jobId}'
  `.trim();
}

export function sqlFailJob(jobId: string, errorMessage: string): string {
  const escapedMsg = errorMessage.replace(/'/g, "''");
  return `
    UPDATE novel_kb.jobs SET status = 'failed', error_message = '${escapedMsg}', completed_at = NOW() WHERE id = '${jobId}'
  `.trim();
}

export function sqlGetPendingSteps(jobId: string): string {
  return `
    SELECT id, step_type, target_id, chapter_number, retry_count
    FROM novel_kb.job_steps
    WHERE job_id = '${jobId}' AND status IN ('pending', 'failed') AND retry_count < 3
    ORDER BY chapter_number
  `.trim();
}

export function sqlGetJobProgress(jobId: string): string {
  return `
    SELECT
      (SELECT COUNT(*) FROM novel_kb.job_steps WHERE job_id = '${jobId}') AS total,
      (SELECT COUNT(*) FROM novel_kb.job_steps WHERE job_id = '${jobId}' AND status = 'completed') AS completed,
      (SELECT COUNT(*) FROM novel_kb.job_steps WHERE job_id = '${jobId}' AND status = 'failed') AS failed,
      (SELECT COUNT(*) FROM novel_kb.job_steps WHERE job_id = '${jobId}' AND status = 'running') AS running
  `.trim();
}
