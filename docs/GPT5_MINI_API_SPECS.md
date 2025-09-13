# Spécifications API GPT-5-mini

## Paramètres obligatoires
- `model`: 'gpt-5-mini'
- `messages`: Doit contenir le mot 'JSON' pour utiliser `response_format`
- `response_format`: { type: 'json_object' }

## Paramètres optionnels
- `max_completion_tokens`: Limite de tokens en réponse (ex: 2000)

## Paramètres non supportés
- `temperature`
- `top_p`
- `frequency_penalty`
- `presence_penalty`

## Exemple de configuration valide
```typescript
{
  model: 'gpt-5-mini',
  messages: [
    {
      role: 'system',
      content: 'Tu es un expert en création de quiz éducatifs JSON...'
    }
  ],
  response_format: { type: 'json_object' },
  max_completion_tokens: 2000
}
```
