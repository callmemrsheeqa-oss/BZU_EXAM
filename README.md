# BZU Exam

**BZU Exam** is a university examination management **prototype** inspired by Bahauddin Zakariya University (BZU), Multan. It demonstrates how students, teachers, and administrators could manage online examinations through role-based dashboards.

> **Prototype disclaimer:** This is an independent academic demonstration, not an official BZU service. Accounts and academic records are synthetic. It is not intended for conducting real examinations or storing actual student information.

## Project overview

The prototype is designed to demonstrate the complete examination journey:

1. A teacher creates an exam or quiz and schedules or launches a demo session.
2. An enrolled demo student attempts MCQs and submits subjective answers.
3. MCQs are graded automatically; a teacher reviews subjective submissions and records marks.
4. An administrator reviews requests to revise previously saved marks.
5. The teacher publishes results, which students can view in their dashboard.

## Planned / prototype features

- **Role-based experience:** student, teacher, and administrator dashboards.
- **Examinations:** midterms, finals, quizzes, class tests, and assignment submission windows.
- **Questions:** MCQs, short answers, and long answers; document-assisted paper creation.
- **Submissions:** on-screen responses, optional voice dictation (browser support permitting), and combined PDF uploads.
- **Evaluation:** automatic MCQ scoring, in-browser PDF review, teacher feedback, and marksheets.
- **Marks revision:** approval requests, admin decisions, and a revision history before result publication.
- **Academic calendar:** BZU academic schedule reference for Fall 2026, Spring 2027, and Summer 2027, alongside separate interactive demo exams.
- **Design:** responsive futuristic interface, system-aware light/dark mode, and Spider Cursor login animation.
- **Guided demonstration:** an interactive walkthrough of the teacher → student → admin → result workflow.

## Demo accounts and data

The prototype specification uses **500 fictional students**, **25 fictional teachers**, and **1 demo admin**. Example identifiers include:

- Student: `student001@bzu.edu.pk`
- Teacher: `teacher001@bzu.edu.pk`
- Admin: `admin@admin.bzu.edu.pk`

These are **example identifiers only**, not real university-issued accounts. Any demo credentials should be treated as public test data and never reused for actual accounts.

## Technology

The project specification targets:

- React and TypeScript
- Vite
- Tailwind CSS
- Browser-local persistence for the zero-cost demo
- Optional document parsing and PDF preview tools

Actual dependencies and scripts should be checked against the application's `package.json`.

## Local development

If the repository contains the Vite application and a `package.json`, a typical setup is:

```bash
npm install
npm run dev
```

Use the scripts provided in `package.json` if they differ.

## Deployment

The prototype is intended for GitHub-based deployment to Vercel. Set the correct framework/build settings based on the application files.

**Note:** Browser-local storage is not a shared database. Actions performed in different browsers or on different devices will not automatically synchronize. This limitation is acceptable for a same-browser guided demonstration but not for real examinations.

## Security and academic integrity

This is **not** a production-ready examination system. Real deployments would require server-side authentication and authorization, a secure database, durable file storage, audit trails, accessibility review, load testing, and formal institutional approval. Browser tab-switch detection cannot guarantee cheating prevention.

## Project status

**Interactive academic prototype / demonstration.** Feature availability depends on the version of the application currently committed to the repository.

---

Built as an independent educational project for exploring university examination workflows.
