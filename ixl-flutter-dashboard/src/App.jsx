
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { CreateQuestion } from './pages/CreateQuestion';
import { JsonImport } from './pages/JsonImport';

import { ResourceList } from './pages/ResourceList';
import { MicroSkills } from './pages/MicroSkills';
import { MediaGallery } from './pages/MediaGallery';
import { AutoQuestionGenerator } from './pages/AutoQuestionGenerator';
import { SvgGenerator } from './pages/SvgGenerator';
import { BulkGenerator } from './pages/BulkGenerator';
import { Documentation } from './pages/Documentation';
import { WYSIWYGEditor } from './pages/WYSIWYGEditor';
import EquationReference from './pages/EquationReference';
import { JsonView } from './pages/JsonView';
import { QuestionSchemaDocs } from './pages/QuestionSchemaDocs';


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="create" element={<CreateQuestion />} />
          <Route path="edit/:id" element={<CreateQuestion />} />
          <Route path="visual-editor" element={<WYSIWYGEditor />} />
          <Route path="equation-reference" element={<EquationReference />} />
          <Route path="import" element={<JsonImport />} />
          <Route path="docs" element={<Documentation />} />

          <Route path="grades" element={<ResourceList title="Grades" tableName="grades" columns={['id', 'name', 'sort_order', 'color_hex']} sortBy="sort_order" sortAscending={true} />} />

          <Route path="units" element={<ResourceList title="Units" tableName="units" columns={['id', 'name', 'code', 'sort_order', 'subject_id']} sortBy="sort_order" sortAscending={true} relationships={{ subject_id: 'subjects' }} filterColumn="subject_id" upstreamFilter={{ filterColumn: 'subject_id', parentTable: 'grades', parentColumn: 'grade_id', parentLabel: 'Grade' }} />} />
          <Route path="lessons" element={<ResourceList title="Lessons" tableName="lessons" columns={['id', 'slug', 'title', 'microskillId']} sortBy="title" sortAscending={true} />} />
          <Route path="micro-skills" element={<MicroSkills />} />

          <Route path="subjects" element={<ResourceList title="Subjects" tableName="subjects" columns={['id', 'name', 'slug', 'grade_id']} sortBy="name" sortAscending={true} relationships={{ grade_id: 'grades' }} filterColumn="grade_id" />} />

          <Route path="media" element={<MediaGallery />} />
          <Route path="auto-generator" element={<AutoQuestionGenerator />} />
          <Route path="svg-generator" element={<SvgGenerator />} />
          <Route path="bulk-generator" element={<BulkGenerator />} />

          <Route path="json-view" element={<JsonView />} />
          <Route path="schema" element={<QuestionSchemaDocs />} />
          <Route path="users" element={<div className="p-10 text-slate-400 font-medium">User Management Placeholder</div>} />

        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
