SELECT json_build_object(
  'users', (
    SELECT json_agg(json_build_object(
      'id', p.id,
      'username', p.username,
      'name', p.name,
      'email', p.email,
      'role', p.role,
      'password_hash', u.encrypted_password,
      'created_at', p.created_at
    )) FROM public.profiles p JOIN auth.users u ON p.id = u.id
  ),
  'assignments', (SELECT coalesce(json_agg(a.*), '[]'::json) FROM public.assignments a),
  'submissions', (SELECT coalesce(json_agg(s.*), '[]'::json) FROM public.submissions s),
  'announcements', (SELECT coalesce(json_agg(an.*), '[]'::json) FROM public.announcements an),
  'progress', (SELECT coalesce(json_agg(pr.*), '[]'::json) FROM public.progress pr),
  'tools', (SELECT coalesce(json_agg(t.*), '[]'::json) FROM public.tools t),
  'tool_downloads', (SELECT coalesce(json_agg(td.*), '[]'::json) FROM public.tool_downloads td),
  'instructors', (SELECT coalesce(json_agg(ins.*), '[]'::json) FROM public.instructors ins)
);
