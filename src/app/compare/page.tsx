
import { fetchGithubPage } from "../../server/lib/github";
import { Profile } from "./profile";

export default async function Page(props: {
  searchParams: {
    github: string;
    twitter: string;
  } | {
    name: string;
  };
}) {
  const {github, twitter} = 'name' in props.searchParams ? { github: props.searchParams.name, twitter: props.searchParams.name } : props.searchParams;
  const placeholder = await fetchGithubPage(github);
  
  return (
    <Profile
      githubName={github}
      twitterName={twitter}
    />
  );
}
