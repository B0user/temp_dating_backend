const register = async (req, res) => {
  try {
    const { user, token } = await authService.register(req.body, req.files);
    res.status(201).json({ user, token });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({ error: error.message });
  }
}; 